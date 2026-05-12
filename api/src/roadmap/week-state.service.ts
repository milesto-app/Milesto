import { Injectable } from "@nestjs/common";

import { SupabaseService } from "../supabase/supabase.service.js";
import type {
  WeeklyPlanResponse,
  WeekState,
} from "./types/week-state.types.js";
import type { WeeklyPlan } from "./types/weekly-plan.types.js";

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
  ): Promise<WeeklyPlanResponse> {
    const plan = await this.fetchLatestPlan(goalId, userId);
    if (plan === null) {
      return {
        plan: null,
        week_state: "no_plan",
        next_week_starts_at: this.todayIsoDate(),
        all_tasks_completed: false,
        has_debrief: false,
      };
    }

    const [isAllTasksCompleted, hasDebrief] = await Promise.all([
      this.isAllTasksCompleted(plan.id),
      this.hasDebrief(plan.id),
    ]);

    const weekState = this.deriveState({
      plan,
      isAllTasksCompleted,
      hasDebrief,
    });
    const nextWeekStartsAt = this.computeNextWeekStartsAt(plan, weekState);

    return {
      plan,
      week_state: weekState,
      next_week_starts_at: nextWeekStartsAt,
      all_tasks_completed: isAllTasksCompleted,
      has_debrief: hasDebrief,
    };
  }

  public async isGenerationAllowed(
    goalId: string,
    userId: string,
  ): Promise<{ isAllowed: boolean; nextUnlockDate: string }> {
    const plan = await this.fetchLatestPlan(goalId, userId);
    if (plan === null) {
      return { isAllowed: true, nextUnlockDate: this.todayIsoDate() };
    }
    const unlockDate = this.addDays(plan.week_start_date, DAYS_PER_WEEK);
    const today = this.todayIsoDate();
    return {
      isAllowed: today >= unlockDate,
      nextUnlockDate: unlockDate,
    };
  }

  public computeWeekStartForNewPlan(lastPlan: WeeklyPlan | null): string {
    const todayMonday = this.currentWeekMonday();
    if (lastPlan === null) {
      return todayMonday;
    }
    const candidate = this.addDays(lastPlan.week_start_date, DAYS_PER_WEEK);
    return candidate > todayMonday ? candidate : todayMonday;
  }

  public async getNextWeekStartDate(
    goalId: string,
    userId: string,
  ): Promise<string> {
    const plan = await this.fetchLatestPlan(goalId, userId);
    return this.computeWeekStartForNewPlan(plan);
  }

  private async fetchLatestPlan(
    goalId: string,
    userId: string,
  ): Promise<WeeklyPlan | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from("weekly_plans")
      .select("*")
      .eq("goal_id", goalId)
      .eq("user_id", userId)
      .order("week_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as WeeklyPlan | null) ?? null;
  }

  private async isAllTasksCompleted(weeklyPlanId: string): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from("weekly_tasks")
      .select("is_completed")
      .eq("weekly_plan_id", weeklyPlanId);
    if (data === null || data.length === 0) {
      return false;
    }
    return data.every((row: { is_completed: boolean }) => row.is_completed);
  }

  private async hasDebrief(weeklyPlanId: string): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();
    const { count } = await supabase
      .from("debriefs")
      .select("id", { count: "exact", head: true })
      .eq("weekly_plan_id", weeklyPlanId);
    return (count ?? 0) > 0;
  }

  private deriveState(params: {
    plan: WeeklyPlan;
    isAllTasksCompleted: boolean;
    hasDebrief: boolean;
  }): WeekState {
    const { plan, isAllTasksCompleted, hasDebrief } = params;
    const today = this.todayIsoDate();
    const weekEnd = this.addDays(plan.week_start_date, DAYS_PER_WEEK - 1);
    const unlockDate = this.addDays(plan.week_start_date, DAYS_PER_WEEK);

    if (plan.status === "completed") {
      return today < unlockDate ? "in_advance" : "no_plan";
    }

    if (isAllTasksCompleted && !hasDebrief) {
      return "ready_to_debrief";
    }
    if (today > weekEnd) {
      return "late";
    }
    return "active";
  }

  private computeNextWeekStartsAt(
    plan: WeeklyPlan,
    weekState: WeekState,
  ): string | null {
    if (weekState === "in_advance") {
      return this.addDays(plan.week_start_date, DAYS_PER_WEEK);
    }
    if (weekState === "late" || weekState === "no_plan") {
      return this.todayIsoDate();
    }
    return this.addDays(plan.week_start_date, DAYS_PER_WEEK);
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
}
