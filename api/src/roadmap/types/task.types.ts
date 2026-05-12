export interface Task {
  id: string;
  milestone_id: string;
  goal_id: string;
  title: string;
  description: string;
  estimated_minutes: number | null;
  order_index: number;
  created_at: string;
  completed_at: string | null;
}

export interface Debrief {
  id: string;
  goal_id: string;
  user_id: string;
  date: string;
  note: string;
  milestone_id: string | null;
  created_at: string;
}
