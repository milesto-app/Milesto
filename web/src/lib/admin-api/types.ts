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
