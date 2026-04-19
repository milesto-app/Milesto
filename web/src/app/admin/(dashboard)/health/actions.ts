"use server";

import { checkHealth, type HealthResult } from "@/lib/supabase/queries/health";

export async function refreshHealth(): Promise<HealthResult> {
  return checkHealth();
}
