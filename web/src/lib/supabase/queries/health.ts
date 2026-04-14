import "server-only";

import { createAdminClient } from "../admin";
import { requireAdmin } from "../require-admin";

export type HealthResult = {
  backend: { status: "healthy" | "unhealthy"; responseTimeMs: number };
  supabase: { status: "healthy" | "unhealthy"; responseTimeMs: number };
};

export async function checkHealth(): Promise<HealthResult> {
  await requireAdmin();

  const [backend, supa] = await Promise.all([
    checkBackend(),
    checkSupabase(),
  ]);

  return { backend, supabase: supa };
}

async function checkBackend(): Promise<HealthResult["backend"]> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${process.env.BACKEND_URL}/api/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    return {
      status: res.ok ? "healthy" : "unhealthy",
      responseTimeMs: Date.now() - start,
    };
  } catch {
    return { status: "unhealthy", responseTimeMs: Date.now() - start };
  }
}

async function checkSupabase(): Promise<HealthResult["supabase"]> {
  const start = Date.now();
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    return {
      status: error ? "unhealthy" : "healthy",
      responseTimeMs: Date.now() - start,
    };
  } catch {
    return { status: "unhealthy", responseTimeMs: Date.now() - start };
  }
}
