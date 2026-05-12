export type WeeklyPlanStatus = "active" | "completed";

export interface WeeklyPlan {
  id: string;
  milestone_id: string;
  goal_id: string;
  user_id: string;
  week_number: number;
  week_start_date: string;
  objectives: string[];
  generation_context: GenerationContext;
  summary: WeeklySummary | null;
  status: WeeklyPlanStatus;
  is_fallback: boolean;
  model_used: string | null;
  generation_metadata: Record<string, unknown>;
  created_at: string;
}

export interface GenerationContext {
  milestone_title?: string;
  milestone_description?: string;
  milestone_expected_outcome?: string;
  last_weekly_summary?: WeeklySummary | null;
  last_monthly_summary?: Record<string, unknown> | null;
  task_completion_rate?: number;
  tasks_completed?: number;
  tasks_total?: number;
}

export interface WeeklySummary {
  completion_rate: number;
  tasks_completed: number;
  tasks_total: number;
  debrief_count?: number;
  narrative?: string;
}

export interface MonthlySummary {
  completion_rate: number;
  tasks_completed: number;
  tasks_total: number;
  debrief_count: number;
  narrative?: string;
}

export interface WeekData {
  tasksCompleted: number;
  tasksTotal: number;
  debriefNotes: string[];
}

import type { Milestone, Roadmap } from "./roadmap.types.js";

export interface GenerateAndStoreParams {
  goalId: string;
  userId: string;
  roadmap: Pick<Roadmap, "goal_id" | "created_at">;
  milestone: Milestone;
  weekNumber: number;
  weekStartDate: string;
  generationContext: GenerationContext;
  language: string;
}

export interface StorePlanRow {
  milestone_id: string;
  goal_id: string;
  user_id: string;
  week_number: number;
  week_start_date: string;
  objectives: string[];
  generation_context: Record<string, unknown>;
  is_fallback: boolean;
  model_used: string | null;
  generation_metadata: Record<string, unknown>;
}
