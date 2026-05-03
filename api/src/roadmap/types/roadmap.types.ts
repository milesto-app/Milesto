export type RoadmapStatus = "generating" | "complete" | "failed";

export interface Roadmap {
  goal_id: string;
  user_id: string;
  status: RoadmapStatus;
  generation_attempts: number;
  model_used: string | null;
  generation_metadata: Record<string, unknown>;
  quality_scores: Record<string, unknown> | null;
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
  created_at: string;
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
}
