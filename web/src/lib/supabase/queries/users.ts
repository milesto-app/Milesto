import "server-only";

import { createAdminClient } from "../admin";
import { requireAdmin } from "../require-admin";

export type AdminUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  subscriptionStatus: string;
  coachId: number | null;
  createdAt: string;
};

export type UserDetail = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  coachId: number | null;
  language: string | null;
  createdAt: string;
  goals: UserGoal[];
};

export type UserGoal = {
  id: string;
  title: string;
  status: string;
  targetDate: string | null;
  createdAt: string;
  milestoneCount: number;
  totalTasks: number;
  completedTasks: number;
};

export async function getUsers(page = 1, perPage = 20) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: usersData } = await supabase.auth.admin.listUsers({
    page,
    perPage,
  });

  const users = usersData?.users ?? [];
  const total =
    (usersData as unknown as { users: unknown[]; total: number })?.total ?? 0;

  if (users.length === 0) {
    return { users: [] as AdminUser[], totalPages: 0, currentPage: page };
  }

  const userIds = users.map((u) => u.id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, subscription_status, coach_id")
    .in("id", userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  const merged: AdminUser[] = users.map((u) => {
    const profile = profileMap.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "",
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      subscriptionStatus: profile?.subscription_status ?? "free",
      coachId: profile?.coach_id ?? null,
      createdAt: u.created_at,
    };
  });

  return {
    users: merged,
    totalPages: Math.ceil(total / perPage),
    currentPage: page,
  };
}

export async function getUserDetail(
  userId: string,
): Promise<UserDetail | null> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: userData } = await supabase.auth.admin.getUserById(userId);
  if (!userData?.user) return null;

  const user = userData.user;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "first_name, last_name, subscription_status, subscription_expires_at, coach_id, language",
    )
    .eq("id", userId)
    .single();

  const { data: goals } = await supabase
    .from("goals")
    .select("id, title, status, target_date, created_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const userGoals: UserGoal[] = [];

  if (goals && goals.length > 0) {
    const goalIds = goals.map((g) => g.id);

    const [milestonesRes, tasksRes] = await Promise.all([
      supabase.from("milestones").select("goal_id").in("goal_id", goalIds),
      supabase
        .from("weekly_tasks")
        .select("goal_id, is_completed")
        .in("goal_id", goalIds),
    ]);

    const milestoneCounts = new Map<string, number>();
    for (const m of milestonesRes.data ?? []) {
      milestoneCounts.set(m.goal_id, (milestoneCounts.get(m.goal_id) ?? 0) + 1);
    }

    const taskCounts = new Map<string, { total: number; completed: number }>();
    for (const t of tasksRes.data ?? []) {
      const entry = taskCounts.get(t.goal_id) ?? { total: 0, completed: 0 };
      entry.total++;
      if (t.is_completed) entry.completed++;
      taskCounts.set(t.goal_id, entry);
    }

    for (const goal of goals) {
      const tasks = taskCounts.get(goal.id) ?? { total: 0, completed: 0 };
      userGoals.push({
        id: goal.id,
        title: goal.title,
        status: goal.status,
        targetDate: goal.target_date,
        createdAt: goal.created_at,
        milestoneCount: milestoneCounts.get(goal.id) ?? 0,
        totalTasks: tasks.total,
        completedTasks: tasks.completed,
      });
    }
  }

  return {
    id: user.id,
    email: user.email ?? "",
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    subscriptionStatus: profile?.subscription_status ?? "free",
    subscriptionExpiresAt: profile?.subscription_expires_at ?? null,
    coachId: profile?.coach_id ?? null,
    language: profile?.language ?? null,
    createdAt: user.created_at,
    goals: userGoals,
  };
}

export async function searchUsers(query: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: usersData } = await supabase.auth.admin.listUsers({
    perPage: 50,
  });

  const users = usersData?.users ?? [];
  const lowerQuery = query.toLowerCase();
  const filtered = users.filter((u) =>
    u.email?.toLowerCase().includes(lowerQuery),
  );

  if (filtered.length === 0) return { users: [] as AdminUser[] };

  const userIds = filtered.map((u) => u.id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, subscription_status, coach_id")
    .in("id", userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  const merged: AdminUser[] = filtered.map((u) => {
    const profile = profileMap.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "",
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      subscriptionStatus: profile?.subscription_status ?? "free",
      coachId: profile?.coach_id ?? null,
      createdAt: u.created_at,
    };
  });

  return { users: merged };
}
