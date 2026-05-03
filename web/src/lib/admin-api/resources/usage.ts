import "server-only";

import { apiFetch } from "@/lib/admin-api/client";
import type {
  AdminUsageByTypeEntry,
  AdminUsageCostEstimate,
  AdminUsageDaily,
  AdminUsageTopUser,
  AdminUsageTotals,
} from "@/lib/admin-api/types";

const DEFAULT_REVALIDATE_SECONDS = 30;
const USAGE_TAG = "admin:usage";

function next() {
  return { tags: [USAGE_TAG], revalidate: DEFAULT_REVALIDATE_SECONDS };
}

export async function getDailyUsage(
  days?: number,
  type?: string,
): Promise<AdminUsageDaily> {
  return apiFetch<AdminUsageDaily>("/admin/usage/daily", {
    next: next(),
    query: { days, type },
  });
}

export async function getUsageTotals(days?: number): Promise<AdminUsageTotals> {
  return apiFetch<AdminUsageTotals>("/admin/usage/totals", {
    next: next(),
    query: { days },
  });
}

export async function getUsageByType(
  days?: number,
): Promise<AdminUsageByTypeEntry[]> {
  return apiFetch<AdminUsageByTypeEntry[]>("/admin/usage/by-type", {
    next: next(),
    query: { days },
  });
}

export async function getTopUsers(
  limit?: number,
  days?: number,
): Promise<AdminUsageTopUser[]> {
  return apiFetch<AdminUsageTopUser[]>("/admin/usage/top-users", {
    next: next(),
    query: { limit, days },
  });
}

export async function getCostEstimate(
  days?: number,
): Promise<AdminUsageCostEstimate> {
  return apiFetch<AdminUsageCostEstimate>("/admin/usage/cost-estimate", {
    next: next(),
    query: { days },
  });
}
