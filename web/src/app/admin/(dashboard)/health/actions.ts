"use server";

import { getHealth } from "@/lib/admin-api/resources/system";
import type { AdminHealthReport } from "@/lib/admin-api/types";

export async function refreshHealth(): Promise<AdminHealthReport> {
  return getHealth();
}
