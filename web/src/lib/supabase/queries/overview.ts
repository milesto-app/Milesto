import "server-only";

import { createAdminClient } from "../admin";
import { requireAdmin } from "../require-admin";

export async function getOverviewStats() {
  await requireAdmin();
  const supabase = createAdminClient();

  const [usersRes, goalsRes, subsRes, genRes] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 1, page: 1 }),
    supabase
      .from("goals")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .is("deleted_at", null),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("subscription_status", "active")
      .gt("subscription_expires_at", new Date().toISOString()),
    supabase
      .from("generation_usage")
      .select("*", { count: "exact", head: true })
      .eq("usage_date", new Date().toISOString().split("T")[0]),
  ]);

  return {
    totalUsers:
      (usersRes.data as unknown as { users: unknown[]; total: number })
        ?.total ?? 0,
    activeGoals: goalsRes.count ?? 0,
    proSubscriptions: subsRes.count ?? 0,
    todayGenerations: genRes.count ?? 0,
  };
}

export async function getRecentGoals(limit = 10) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: goals } = await supabase
    .from("goals")
    .select("id, title, status, created_at, user_id")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!goals || goals.length === 0) return [];

  const userIds = [...new Set(goals.map((g) => g.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  return goals.map((goal) => {
    const profile = profileMap.get(goal.user_id);
    return {
      ...goal,
      userName: profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
          "Unknown"
        : "Unknown",
    };
  });
}
