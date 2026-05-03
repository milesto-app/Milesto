import "server-only";

import { apiFetch } from "@/lib/admin-api/client";
import type {
  AdminHealthReport,
  AdminLlmHealthReport,
  AdminLogLevel,
  AdminSystemLog,
} from "@/lib/admin-api/types";

const SYSTEM_TAG = "admin:system";

export async function getHealth(): Promise<AdminHealthReport> {
  return apiFetch<AdminHealthReport>("/admin/health", {
    cache: "no-store",
  });
}

export async function getLlmHealth(): Promise<AdminLlmHealthReport> {
  return apiFetch<AdminLlmHealthReport>("/admin/health/llm", {
    cache: "no-store",
  });
}

export type ListLogsParams = {
  level?: AdminLogLevel;
  since?: string;
  limit?: number;
};

export async function listLogs(
  params: ListLogsParams = {},
): Promise<AdminSystemLog[]> {
  return apiFetch<AdminSystemLog[]>("/admin/logs", {
    next: { tags: [SYSTEM_TAG], revalidate: 30 },
    query: {
      level: params.level,
      since: params.since,
      limit: params.limit,
    },
  });
}
