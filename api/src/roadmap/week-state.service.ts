import { Injectable } from "@nestjs/common";

import type { Database } from "../supabase/database.types.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import type { Milestone } from "./types/roadmap.types.js";
import type {
  CurrentWeekResponse,
  WeekState,
} from "./types/week-state.types.js";

const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 86_400_000;
const SUNDAY_DAY = 0;
const SUNDAY_OFFSET = -6;
const MONDAY_OFFSET = 1;

@Injectable()
export class WeekStateService {
  constructor(private readonly supabaseService: SupabaseService) {}

  public async computeForGoal(
    goalId: string,
    userId: string,
  ): Promise<CurrentWeekResponse> {
    const milestone = await this.getCurrentActive(goalId, userId);
    if (milestone === null) {
      // Check for in_advance: last completed milestone finished within the last 7 days
      const lastActivated = await this.getLastActivated(goalId, userId);
      if (lastActivated !== null && lastActivated.starts_at !== null) {
        const unlockDate = this.addDays(lastActivated.starts_at, DAYS_PER_WEEK);
        const today = this.todayIsoDate();
        if (today < unlockDate) {
          return {
            milestone: lastActivated,
            week_state: "in_advance",
            next_week_starts_at: unlockDate,
            all_tasks_completed: true,
            has_debrief: true,
          };
        }
      }
      return {
        milestone: null,
        week_state: "no_milestone",
        next_week_starts_at: this.todayIsoDate(),
        all_tasks_completed: false,
        has_debrief: false,
      };
    }

    const [isAllTasksCompleted, hasDebrief] = await Promise.all([
      this.isAllTasksCompleted(milestone.id),
      this.hasDebrief(milestone.id),
    ]);

    const weekState = this.deriveState({
      milestone,
      isAllTasksCompleted,
      hasDebrief,
    });
    const nextWeekStartsAt = this.computeNextWeekStartsAt(milestone, weekState);

    return {
      milestone,
      week_state: weekState,
      next_week_starts_at: nextWeekStartsAt,
      all_tasks_completed: isAllTasksCompleted,
      has_debrief: hasDebrief,
    };
  }

  public async isActivationAllowed(
    goalId: string,
    userId: string,
  ): Promise<{ isAllowed: boolean; nextUnlockDate: string }> {
    const lastActivated = await this.getLastActivated(goalId, userId);
    if (lastActivated === null || lastActivated.starts_at === null) {
      return { isAllowed: true, nextUnlockDate: this.todayIsoDate() };
    }
    const unlockDate = this.addDays(lastActivated.starts_at, DAYS_PER_WEEK);
    const today = this.todayIsoDate();
    return {
      isAllowed: today >= unlockDate,
      nextUnlockDate: unlockDate,
    };
  }

  public computeStartsAtForNextMilestone(lastActive: Milestone | null): string {
    const todayMonday = this.currentWeekMonday();
    if (lastActive === null || lastActive.starts_at === null) {
      return todayMonday;
    }
    const candidate = this.addDays(lastActive.starts_at, DAYS_PER_WEEK);
    return candidate > todayMonday ? candidate : todayMonday;
  }

  private async getCurrentActive(
    goalId: string,
    userId: string,
  ): Promise<Milestone | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from("milestones")
      .select("*, goals!inner(user_id)")
      .eq("goal_id", goalId)
      .eq("goals.user_id", userId)
      .not("starts_at", "is", null)
      .is("completed_at", null)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data === null) {
      return null;
    }
    return this.mapMilestoneRow(data);
  }

  private async getLastActivated(
    goalId: string,
    userId: string,
  ): Promise<Milestone | null> {
    const supabase = this.supabaseService.getAdminClient();
    // Get the most recently started milestone (whether completed or not)
    const { data } = await supabase
      .from("milestones")
      .select("*, goals!inner(user_id)")
      .eq("goal_id", goalId)
      .eq("goals.user_id", userId)
      .not("starts_at", "is", null)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data === null) {
      return null;
    }
    return this.mapMilestoneRow(data);
  }

  private async isAllTasksCompleted(milestoneId: string): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from("tasks")
      .select("completed_at")
      .eq("milestone_id", milestoneId);
    if (data === null || data.length === 0) {
      return false;
    }
    return data.every(
      (row: { completed_at: string | null }) => row.completed_at !== null,
    );
  }

  private async hasDebrief(milestoneId: string): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();
    const { count } = await supabase
      .from("debriefs")
      .select("id", { count: "exact", head: true })
      .eq("milestone_id", milestoneId);
    return (count ?? 0) > 0;
  }

  private deriveState(params: {
    milestone: Milestone;
    isAllTasksCompleted: boolean;
    hasDebrief: boolean;
  }): WeekState {
    const { milestone, isAllTasksCompleted, hasDebrief } = params;

    if (milestone.starts_at === null) {
      return "no_milestone";
    }

    const today = this.todayIsoDate();
    const weekEnd = this.addDays(milestone.starts_at, DAYS_PER_WEEK - 1);

    if (hasDebrief) {
      const unlockDate = this.addDays(milestone.starts_at, DAYS_PER_WEEK);
      return today < unlockDate ? "in_advance" : "no_milestone";
    }

    if (isAllTasksCompleted) {
      return "ready_to_debrief";
    }
    if (today > weekEnd) {
      return "late";
    }
    return "active";
  }

  private computeNextWeekStartsAt(
    milestone: Milestone,
    weekState: WeekState,
  ): string | null {
    if (milestone.starts_at === null) {
      return this.todayIsoDate();
    }
    if (weekState === "in_advance") {
      return this.addDays(milestone.starts_at, DAYS_PER_WEEK);
    }
    if (weekState === "late" || weekState === "no_milestone") {
      return this.todayIsoDate();
    }
    return this.addDays(milestone.starts_at, DAYS_PER_WEEK);
  }

  private todayIsoDate(): string {
    return new Date().toISOString().split("T")[0] ?? "";
  }

  private currentWeekMonday(): string {
    const now = new Date();
    const day = now.getDay();
    const diff =
      now.getDate() -
      day +
      (day === SUNDAY_DAY ? SUNDAY_OFFSET : MONDAY_OFFSET);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split("T")[0] ?? "";
  }

  private addDays(isoDate: string, days: number): string {
    const date = new Date(`${isoDate}T00:00:00.000Z`);
    const result = new Date(date.getTime() + days * MS_PER_DAY);
    return result.toISOString().split("T")[0] ?? "";
  }

  private mapMilestoneRow(
    row: Database["public"]["Tables"]["milestones"]["Row"],
  ): Milestone {
    return {
      id: row.id,
      goal_id: row.goal_id,
      order_index: row.order_index,
      title: row.title,
      description: row.description,
      expected_outcome: row.expected_outcome,
      target_month: row.target_month,
      target_week: row.target_week,
      is_monthly_checkpoint: row.is_monthly_checkpoint,
      completed_at: row.completed_at,
      created_at: row.created_at ?? new Date().toISOString(),
      starts_at: row.starts_at,
      summary: row.summary as Milestone["summary"],
      monthly_summary: row.monthly_summary as Milestone["monthly_summary"],
      is_fallback: row.is_fallback,
      generation_context:
        (row.generation_context as Milestone["generation_context"] | null) ??
        {},
      generation_metadata:
        (row.generation_metadata as Record<string, unknown> | null) ?? {},
      model_used: row.model_used,
    };
  }
}
