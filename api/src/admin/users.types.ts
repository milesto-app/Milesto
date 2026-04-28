export interface AdminUserSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  subscriptionStatus: string;
  coachId: number | null;
  createdAt: string;
}

export interface AdminUserList {
  users: AdminUserSummary[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  language: string | null;
  timezone: string | null;
  dateOfBirth: string | null;
  coachId: number | null;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  createdAt: string;
  goalCount: number;
}

export interface AdminUserGoal {
  id: string;
  title: string;
  status: string;
  targetDate: string | null;
  createdAt: string;
  milestoneCount: number;
  totalTasks: number;
  completedTasks: number;
}

export interface AdminUserUsageEntry {
  id: string;
  generationType: string;
  usageDate: string;
  createdAt: string;
}

export interface AdminUserUsage {
  totalGenerations: number;
  byType: Record<string, number>;
  recent: AdminUserUsageEntry[];
}

export interface AdminUserSubscription {
  status: string;
  expiresAt: string | null;
  productId: string | null;
  environment: string | null;
  autoRenewStatus: boolean | null;
  originalTransactionId: string | null;
  appleSignedAt: string | null;
  verifiedAt: string | null;
}

export interface AdminUserDevice {
  id: string;
  platform: string;
  environment: string;
  tokenLast4: string;
  createdAt: string;
  updatedAt: string;
}
