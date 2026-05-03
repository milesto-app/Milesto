import "server-only";

import { apiFetch } from "@/lib/admin-api/client";
import type {
  ActivityTimelineEntry,
  OverviewStats,
  RecentGoalSummary,
  RecentSignupSummary,
} from "@/lib/admin-api/types";

const DEFAULT_REVALIDATE_SECONDS = 30;
const OVERVIEW_TAG = "admin:overview";

function defaultNext() {
  return {
    tags: [OVERVIEW_TAG],
    revalidate: DEFAULT_REVALIDATE_SECONDS,
  };
}

export async function getOverviewStats(): Promise<OverviewStats> {
  return apiFetch<OverviewStats>("/admin/overview/stats", {
    next: defaultNext(),
  });
}

export async function getRecentGoals(
  limit?: number,
): Promise<RecentGoalSummary[]> {
  return apiFetch<RecentGoalSummary[]>("/admin/overview/recent-goals", {
    next: defaultNext(),
    query: { limit },
  });
}

export async function getRecentSignups(
  limit?: number,
): Promise<RecentSignupSummary[]> {
  return apiFetch<RecentSignupSummary[]>("/admin/overview/recent-signups", {
    next: defaultNext(),
    query: { limit },
  });
}

export async function getActivityTimeline(
  days?: number,
): Promise<ActivityTimelineEntry[]> {
  return apiFetch<ActivityTimelineEntry[]>("/admin/overview/activity-timeline", {
    next: defaultNext(),
    query: { days },
  });
}
