import "server-only";

import { apiFetch } from "@/lib/admin-api/client";
import type {
  AdminHealthReport,
  AdminLlmHealthReport,
} from "@/lib/admin-api/types";

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
