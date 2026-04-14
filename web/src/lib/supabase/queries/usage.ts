import "server-only";

import { createAdminClient } from "../admin";
import { requireAdmin } from "../require-admin";

type DailyData = {
  date: string;
  [type: string]: number | string;
};

export async function getUsageStats(days = 30) {
  await requireAdmin();
  const supabase = createAdminClient();

  const today = new Date();
  const sinceDate = new Date(today);
  sinceDate.setUTCDate(sinceDate.getUTCDate() - (days - 1));
  const sinceDateStr = sinceDate.toISOString().split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  const { data: records } = await supabase
    .from("generation_usage")
    .select("usage_date, generation_type")
    .gte("usage_date", sinceDateStr)
    .lte("usage_date", todayStr);

  const dailyMap = new Map<string, Record<string, number>>();
  const totalsByType: Record<string, number> = {};

  for (const record of records ?? []) {
    const date = record.usage_date;
    const type = record.generation_type;

    if (!dailyMap.has(date)) dailyMap.set(date, {});
    const dayEntry = dailyMap.get(date)!;
    dayEntry[type] = (dayEntry[type] ?? 0) + 1;

    totalsByType[type] = (totalsByType[type] ?? 0) + 1;
  }

  // Fill zero-usage days so the chart doesn't compress gaps
  const cursor = new Date(sinceDate);
  while (cursor <= today) {
    const dateStr = cursor.toISOString().split("T")[0];
    if (!dailyMap.has(dateStr)) dailyMap.set(dateStr, {});
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const dailyData: DailyData[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));

  return { dailyData, totalsByType };
}

export async function getTopUsers(limit = 10) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: records } = await supabase
    .from("generation_usage")
    .select("user_id");

  const countMap = new Map<string, number>();
  for (const r of records ?? []) {
    countMap.set(r.user_id, (countMap.get(r.user_id) ?? 0) + 1);
  }

  const sorted = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (sorted.length === 0) return [];

  const userIds = sorted.map(([id]) => id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  return sorted.map(([userId, count]) => {
    const profile = profileMap.get(userId);
    return {
      userId,
      name: profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
          "Unknown"
        : "Unknown",
      count,
    };
  });
}

export async function getSubscriptionDistribution() {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("subscription_status");

  const counts: Record<string, number> = {};
  for (const p of profiles ?? []) {
    const status = p.subscription_status || "free";
    counts[status] = (counts[status] ?? 0) + 1;
  }

  return counts;
}
