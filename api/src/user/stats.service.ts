import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import type { Database } from "../supabase/database.types.js";
import { SupabaseService } from "../supabase/supabase.service.js";

const DAYS_IN_WINDOW = 7;
const DAY_MS = 86_400_000;
const SUNDAY = 0;
const SUNDAY_TO_MONDAY_OFFSET = -6;
const MONDAY_DELTA = 1;
const DATE_PAD = 2;

type TaskRow = Pick<
  Database["public"]["Tables"]["tasks"]["Row"],
  "is_completed" | "milestone_id" | "created_at" | "completed_at"
>;
type MilestoneRow = Pick<
  Database["public"]["Tables"]["milestones"]["Row"],
  "id" | "completed_at"
>;

export interface DayActivity {
  date: string;
  objectives_completed: number;
  objectives_total: number;
}

export interface StreakStats {
  current: number;
  best: number;
  last_7_days: DayActivity[];
}

export interface CompletionStats {
  overall_rate: number;
  this_week_rate: number;
  total_completed: number;
  total_objectives: number;
}

export interface WeeklyProgress {
  week_number: number;
  completion_rate: number;
  objectives_completed: number;
  objectives_total: number;
}

export interface MilestoneProgress {
  completed: number;
  total: number;
}

export interface StatsResponse {
  goal_id: string;
  updated_at: string;
  streak: StreakStats;
  completion: CompletionStats;
  weekly_progress: WeeklyProgress[];
  milestones: MilestoneProgress;
}

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async getForGoal(
    userId: string,
    goalId: string,
  ): Promise<StatsResponse> {
    await this.assertGoalOwnership(userId, goalId);

    const supabase = this.supabaseService.getAdminClient();
    const [tasksRes, milestonesRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("is_completed, milestone_id, created_at, completed_at")
        .eq("goal_id", goalId)
        .eq("user_id", userId),
      supabase
        .from("milestones")
        .select("id, completed_at")
        .eq("goal_id", goalId)
        .not("starts_at", "is", null)
        .order("order_index", { ascending: true }),
    ]);

    if (tasksRes.error || milestonesRes.error) {
      this.logger.error(
        `Stats query failed for goal ${goalId}: ${
          (tasksRes.error ?? milestonesRes.error)?.message ?? ""
        }`,
      );
      throw new InternalServerErrorException("Failed to compute stats");
    }

    const tasks = tasksRes.data;
    const milestones = milestonesRes.data;

    return {
      goal_id: goalId,
      updated_at: new Date().toISOString(),
      streak: this.computeStreak(tasks),
      completion: this.computeCompletion(tasks),
      weekly_progress: this.computeWeeklyProgress(milestones, tasks),
      milestones: this.computeMilestones(milestones),
    };
  }

  private async assertGoalOwnership(
    userId: string,
    goalId: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("goals")
      .select("id")
      .eq("id", goalId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error !== null || data === null) {
      throw new NotFoundException("Goal not found");
    }
  }

  private computeStreak(tasks: TaskRow[]): StreakStats {
    const completionDays = tasks
      .filter((t) => t.is_completed && t.completed_at !== null)
      .map((t) =>
        this.startOfDay(new Date(t.completed_at as string)).getTime(),
      );

    const completionsByDay = this.groupByDay(completionDays);
    const today = this.startOfDay(new Date()).getTime();
    const last7Days = this.buildLast7Days(completionsByDay, today);
    const uniqueDays = new Set(completionDays);
    const currentStreak = this.computeCurrentStreak(uniqueDays, today);
    const bestStreak = this.computeBestStreak(uniqueDays, currentStreak);

    return { current: currentStreak, best: bestStreak, last_7_days: last7Days };
  }

  private groupByDay(days: number[]): Map<number, number> {
    const map = new Map<number, number>();
    for (const day of days) {
      map.set(day, (map.get(day) ?? 0) + 1);
    }
    return map;
  }

  private buildLast7Days(
    completionsByDay: Map<number, number>,
    today: number,
  ): DayActivity[] {
    let maxDailyInWindow = 0;
    const last7Days: DayActivity[] = [];
    for (let offset = DAYS_IN_WINDOW - 1; offset >= 0; offset -= 1) {
      const day = today - offset * DAY_MS;
      const count = completionsByDay.get(day) ?? 0;
      if (count > maxDailyInWindow) {
        maxDailyInWindow = count;
      }
      last7Days.push({
        date: this.formatDate(new Date(day)),
        objectives_completed: count,
        objectives_total: 0,
      });
    }
    const dailyTarget = Math.max(maxDailyInWindow, 1);
    for (const entry of last7Days) {
      entry.objectives_total = dailyTarget;
    }
    return last7Days;
  }

  private computeCurrentStreak(uniqueDays: Set<number>, today: number): number {
    let streak = 0;
    let cursor = today;
    while (uniqueDays.has(cursor)) {
      streak += 1;
      cursor -= DAY_MS;
    }
    return streak;
  }

  private computeBestStreak(
    uniqueDays: Set<number>,
    currentStreak: number,
  ): number {
    let best = 0;
    let run = 0;
    let previous: number | null = null;
    const sortedDays = [...uniqueDays].sort((a, b) => a - b);
    for (const day of sortedDays) {
      if (previous !== null && day - previous === DAY_MS) {
        run += 1;
      } else {
        run = 1;
      }
      if (run > best) {
        best = run;
      }
      previous = day;
    }
    return Math.max(best, currentStreak);
  }

  private computeCompletion(tasks: TaskRow[]): CompletionStats {
    const totalObjectives = tasks.length;
    const totalCompleted = tasks.filter((t) => t.is_completed).length;
    const overallRate =
      totalObjectives > 0 ? totalCompleted / totalObjectives : 0;

    const mondayStart = this.mondayStartOfThisWeek();
    const thisWeek = tasks.filter((t) => {
      if (t.created_at === null) {
        return false;
      }
      const created = new Date(t.created_at).getTime();
      return created >= mondayStart;
    });
    const thisWeekCompleted = thisWeek.filter((t) => t.is_completed).length;
    const thisWeekRate =
      thisWeek.length > 0 ? thisWeekCompleted / thisWeek.length : 0;

    return {
      overall_rate: overallRate,
      this_week_rate: thisWeekRate,
      total_completed: totalCompleted,
      total_objectives: totalObjectives,
    };
  }

  private computeWeeklyProgress(
    milestones: MilestoneRow[],
    tasks: TaskRow[],
  ): WeeklyProgress[] {
    const tasksByMilestone = new Map<string, TaskRow[]>();
    for (const task of tasks) {
      const list = tasksByMilestone.get(task.milestone_id) ?? [];
      list.push(task);
      tasksByMilestone.set(task.milestone_id, list);
    }
    return milestones.map((milestone, idx) => {
      const milestoneTasks = tasksByMilestone.get(milestone.id) ?? [];
      const completed = milestoneTasks.filter((t) => t.is_completed).length;
      const total = milestoneTasks.length;
      return {
        week_number: idx + MONDAY_DELTA,
        completion_rate: total > 0 ? completed / total : 0,
        objectives_completed: completed,
        objectives_total: total,
      };
    });
  }

  private computeMilestones(milestones: MilestoneRow[]): MilestoneProgress {
    const completed = milestones.filter((m) => m.completed_at !== null).length;
    return { completed, total: milestones.length };
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private mondayStartOfThisWeek(): number {
    const today = this.startOfDay(new Date());
    const day = today.getDay();
    const offset =
      day === SUNDAY ? SUNDAY_TO_MONDAY_OFFSET : MONDAY_DELTA - day;
    today.setDate(today.getDate() + offset);
    return today.getTime();
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + MONDAY_DELTA).padStart(
      DATE_PAD,
      "0",
    );
    const day = String(date.getDate()).padStart(DATE_PAD, "0");
    return `${String(year)}-${month}-${day}`;
  }
}
