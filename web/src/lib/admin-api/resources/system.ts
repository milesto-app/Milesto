import "server-only";

import { apiFetch } from "@/lib/admin-api/client";
import type { AdminHealthReport } from "@/lib/admin-api/types";

export async function getHealth(): Promise<AdminHealthReport> {
  return apiFetch<AdminHealthReport>("/admin/health", {
    cache: "no-store",
  });
}
