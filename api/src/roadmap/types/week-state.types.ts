import type { Milestone } from "./roadmap.types.js";

export type WeekState =
  | "no_milestone"
  | "active"
  | "ready_to_debrief"
  | "in_advance"
  | "late";

export interface CurrentWeekResponse {
  milestone: Milestone | null;
  week_state: WeekState;
  next_week_starts_at: string | null;
  all_tasks_completed: boolean;
  has_debrief: boolean;
}
