// Mirrored from api/src/admin/*.types.ts. Cross-package type imports were
// rejected because the API uses NodeNext .js suffixes outside web's tsconfig
// include, and pulling them in via transpilePackages/rootDirs adds more risk
// than value. Keep this file in sync when API response shapes change. See
// plan §7 risk #1 and the existing root `types:sync` script as precedent.

// --- overview.types.ts ---

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

// --- users.types.ts ---

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

// --- admin-usage.types.ts ---

export interface AdminUsageDailyEntry {
  date: string;
  counts: Record<string, number>;
}

export interface AdminUsageDaily {
  days: AdminUsageDailyEntry[];
}

export type AdminUsageTotals = Record<string, number>;

export interface AdminUsageByTypeEntry {
  type: string;
  count: number;
}

export interface AdminUsageTopUser {
  userId: string;
  name: string;
  count: number;
}

// --- system.types.ts ---

export interface AdminHealthCheck {
  status: "healthy" | "unhealthy";
  responseTimeMs: number;
}

export interface AdminHealthReport {
  backend: AdminHealthCheck;
  supabase: AdminHealthCheck;
  queueDepth: number | null;
}

// --- subscriptions.types.ts (partial — only what Phase 2 needs) ---

export type AdminSubscriptionDistribution = Record<string, number>;
