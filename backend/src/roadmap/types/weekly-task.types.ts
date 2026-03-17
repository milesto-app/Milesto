export type DifficultyRating = 'easy' | 'moderate' | 'hard';

export const DIFFICULTY_RATINGS = ['easy', 'moderate', 'hard'] as const;

export interface WeeklyTask {
  id: string;
  weekly_plan_id: string;
  goal_id: string;
  user_id: string;
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
  task_id: string;
  rating: DifficultyRating;
}

export interface Debrief {
  id: string;
  goal_id: string;
  user_id: string;
  date: string;
  note: string;
  task_ratings: TaskRating[];
  weekly_plan_id: string | null;
  created_at: string;
}
