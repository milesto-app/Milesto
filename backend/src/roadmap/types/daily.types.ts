export const ENERGY_LEVELS = ['high', 'good', 'low', 'very_low'] as const;
export type EnergyLevel = (typeof ENERGY_LEVELS)[number];

export type DifficultyRating = 'easy' | 'moderate' | 'hard';

export interface CheckIn {
  id: string;
  goal_id: string;
  user_id: string;
  date: string;
  energy_level: EnergyLevel;
  note: string | null;
  created_at: string;
}

export interface DailyObjective {
  id: string;
  weekly_plan_id: string;
  goal_id: string;
  user_id: string;
  date: string;
  title: string;
  description: string;
  difficulty_rating: DifficultyRating | null;
  order_index: number;
  is_completed: boolean;
  is_fallback: boolean;
  quality_scores: Record<string, unknown> | null;
  created_at: string;
}

export interface TaskRating {
  objective_id: string;
  rating: DifficultyRating;
}

export interface Debrief {
  id: string;
  goal_id: string;
  user_id: string;
  date: string;
  note: string;
  task_ratings: TaskRating[];
  created_at: string;
}
