export interface OverviewStats {
  totalUsers: number;
  activeGoals: number;
  proSubscriptions: number;
  todayGenerations: number;
}

export interface RecentGoalSummary {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  userId: string;
  userName: string;
}

export interface RecentSignupSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
}

export interface ActivityTimelineEntry {
  date: string;
  signups: number;
  goals: number;
  messages: number;
}
