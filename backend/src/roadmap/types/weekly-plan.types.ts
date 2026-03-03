export type WeeklyPlanStatus = 'active' | 'completed';

export interface WeeklyPlan {
  id: string;
  roadmap_id: string;
  milestone_id: string;
  goal_id: string;
  user_id: string;
  week_number: number;
  week_start_date: string;
  focus: string;
  objectives: string[];
  generation_context: GenerationContext;
  summary: WeeklySummary | null;
  status: WeeklyPlanStatus;
  is_fallback: boolean;
  model_used: string | null;
  generation_metadata: Record<string, unknown>;
  quality_scores: Record<string, unknown> | null;
  created_at: string;
}

export interface GenerationContext {
  milestone_title?: string;
  milestone_description?: string;
  milestone_expected_outcome?: string;
  milestone_target_month?: number;
  last_weekly_summary?: WeeklySummary | null;
  last_monthly_summary?: Record<string, unknown> | null;
  daily_completion_rate?: number;
  daily_objectives_completed?: number;
  daily_objectives_total?: number;
}

export interface WeeklySummary {
  completion_rate: number;
  objectives_completed: number;
  objectives_total: number;
  debrief_count?: number;
  energy_distribution?: Record<string, number>;
  narrative?: string;
}

export interface MonthlySummary {
  completion_rate: number;
  objectives_completed: number;
  objectives_total: number;
  debrief_count: number;
  energy_distribution: Record<string, number>;
  narrative?: string;
}

export interface WeekData {
  objectivesCompleted: number;
  objectivesTotal: number;
  debriefNotes: string[];
  energyDistribution: Record<string, number>;
}

import type { Milestone } from './roadmap.types.js';

export interface GenerateAndStoreParams {
  goalId: string;
  userId: string;
  roadmap: { id: string };
  milestone: Milestone;
  weekNumber: number;
  generationContext: GenerationContext;
  language: string;
}

export interface StorePlanRow {
  roadmap_id: string;
  milestone_id: string;
  goal_id: string;
  user_id: string;
  week_number: number;
  week_start_date: string;
  focus: string;
  objectives: string[];
  generation_context: Record<string, unknown>;
  is_fallback: boolean;
  model_used: string | null;
  generation_metadata: Record<string, unknown>;
}
