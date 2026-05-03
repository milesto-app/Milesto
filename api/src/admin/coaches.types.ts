export interface AdminCoachSummary {
  id: number;
  personality: string;
  displayName: { en: string; fr: string };
  description: { en: string; fr: string };
  icon: string;
  userCount: number;
}

export interface AdminCoachUserSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  subscriptionStatus: string;
  createdAt: string;
}

export interface AdminCoachUserList {
  users: AdminCoachUserSummary[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}
