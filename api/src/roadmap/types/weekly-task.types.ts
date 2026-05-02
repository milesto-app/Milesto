export interface WeeklyTask {
  id: string;
  weekly_plan_id: string;
  goal_id: string;
  user_id: string;
  title: string;
  description: string;
  estimated_minutes: number | null;
  order_index: number;
  is_completed: boolean;
  is_fallback: boolean;
  quality_scores: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

export interface Debrief {
  id: string;
  goal_id: string;
  user_id: string;
  date: string;
  note: string;
  weekly_plan_id: string | null;
  created_at: string;
}
