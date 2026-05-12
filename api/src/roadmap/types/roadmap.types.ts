export type RoadmapStatus = "generating" | "complete" | "failed";

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

export interface WeekData {
  tasksCompleted: number;
  tasksTotal: number;
  debriefNotes: string[];
}

export interface Roadmap {
  goal_id: string;
  user_id: string;
  status: RoadmapStatus;
  generation_attempts: number;
  model_used: string | null;
  generation_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  milestones?: Milestone[];
  current_milestone_id?: string | null;
}

export interface Milestone {
  id: string;
  goal_id: string;
  order_index: number;
  title: string;
  description: string;
  expected_outcome: string;
  target_month: number;
  target_week: number;
  is_monthly_checkpoint: boolean;
  completed_at: string | null;
  created_at: string;
  starts_at: string | null;
  summary: WeeklySummary | null;
  monthly_summary: MonthlySummary | null;
  is_fallback: boolean;
  generation_context: GenerationContext;
  generation_metadata: Record<string, unknown>;
  model_used: string | null;
}

export type MilestoneSummary = Pick<
  Milestone,
  | "id"
  | "title"
  | "description"
  | "expected_outcome"
  | "is_monthly_checkpoint"
  | "order_index"
>;

export interface GenerationMetadata {
  model_used: string;
  latency_ms: number;
  context_chunks_used: number;
  attempts: number;
  prompt_tokens?: number | undefined;
  completion_tokens?: number | undefined;
}

export interface GoalData {
  id: string;
  title: string;
  description: string;
  target_date?: string;
  status: string;
  profile_data?: Record<string, unknown>;
  user_birth_year?: number;
}
