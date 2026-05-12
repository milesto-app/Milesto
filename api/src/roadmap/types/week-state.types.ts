import type { WeeklyPlan } from "./weekly-plan.types.js";

export type WeekState =
  | "no_plan"
  | "active"
  | "ready_to_debrief"
  | "in_advance"
  | "late";

export interface WeeklyPlanResponse {
  plan: WeeklyPlan | null;
  week_state: WeekState;
  next_week_starts_at: string | null;
  all_tasks_completed: boolean;
  has_debrief: boolean;
}
