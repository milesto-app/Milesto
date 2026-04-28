import { Injectable, Logger } from "@nestjs/common";

import { SupabaseService } from "../supabase/supabase.service.js";
import { PRO_SUBSCRIPTION_STATUSES } from "../usage/subscription-state.js";
import type {
  ActivityTimelineEntry,
  OverviewStats,
  RecentGoalSummary,
  RecentSignupSummary,
} from "./overview.types.js";

const ACTIVE_GOAL_STATUS = "active";
const UNKNOWN_USER_NAME = "Unknown";
const TIMELINE_ROW_LIMIT = 50_000;
const ISO_DATE_LENGTH = 10;
const MS_PER_DAY = 86_400_000;

@Injectable()
export class OverviewService {
  private readonly logger = new Logger(OverviewService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async getStats(): Promise<OverviewStats> {
    const supabase = this.supabaseService.getAdminClient();
    const today = isoDate(new Date());
    const nowIso = new Date().toISOString();

    const [usersRes, goalsRes, subsRes, genRes] = await Promise.all([
      supabase.auth.admin.listUsers({ perPage: 1, page: 1 }),
      supabase
        .from("goals")
        .select("*", { count: "exact", head: true })
        .eq("status", ACTIVE_GOAL_STATUS)
        .is("deleted_at", null),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .in("subscription_status", PRO_SUBSCRIPTION_STATUSES)
        .gt("subscription_expires_at", nowIso),
      supabase
        .from("generation_usage")
        .select("*", { count: "exact", head: true })
        .eq("usage_date", today),
    ]);

    return {
      totalUsers: extractTotalUsers(usersRes.data),
      activeGoals: goalsRes.count ?? 0,
      proSubscriptions: subsRes.count ?? 0,
      todayGenerations: genRes.count ?? 0,
    };
  }

  public async getRecentGoals(limit: number): Promise<RecentGoalSummary[]> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: goals, error } = await supabase
      .from("goals")
      .select("id, title, status, created_at, user_id")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error !== null) {
      this.logger.error(`Failed to load recent goals: ${error.message}`);
      return [];
    }
    if (goals.length === 0) {
      return [];
    }

    const userIds = [...new Set(goals.map((g) => g.user_id))];
    const profileMap = await this.loadProfileNames(userIds);

    return goals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      status: goal.status,
      createdAt: goal.created_at,
      userId: goal.user_id,
      userName: profileMap.get(goal.user_id) ?? UNKNOWN_USER_NAME,
    }));
  }

  public async getRecentSignups(limit: number): Promise<RecentSignupSummary[]> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: limit,
    });

    if (error !== null) {
      this.logger.error(`Failed to list recent signups: ${error.message}`);
      return [];
    }

    const users = data.users;
    if (users.length === 0) {
      return [];
    }

    const userIds = users.map((u) => u.id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

    return users.map((user) => {
      const profile = profileMap.get(user.id);
      return {
        id: user.id,
        email: user.email ?? "",
        firstName: profile?.first_name ?? null,
        lastName: profile?.last_name ?? null,
        createdAt: user.created_at,
      };
    });
  }

  public async getActivityTimeline(
    days: number,
  ): Promise<ActivityTimelineEntry[]> {
    const supabase = this.supabaseService.getAdminClient();
    const todayUtcMs = utcMidnightMs(new Date());
    const cutoffIso = new Date(
      todayUtcMs - (days - 1) * MS_PER_DAY,
    ).toISOString();

    const [signupsRes, goalsRes, messagesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", cutoffIso)
        .limit(TIMELINE_ROW_LIMIT),
      supabase
        .from("goals")
        .select("created_at")
        .is("deleted_at", null)
        .gte("created_at", cutoffIso)
        .limit(TIMELINE_ROW_LIMIT),
      supabase
        .from("messages")
        .select("created_at")
        .gte("created_at", cutoffIso)
        .limit(TIMELINE_ROW_LIMIT),
    ]);

    const buckets = initialiseTimelineBuckets(todayUtcMs, days);
    addToBucket(buckets, signupsRes.data ?? [], "signups");
    addToBucket(buckets, goalsRes.data ?? [], "goals");
    addToBucket(buckets, messagesRes.data ?? [], "messages");

    return [...buckets.values()];
  }

  private async loadProfileNames(
    userIds: string[],
  ): Promise<Map<string, string>> {
    if (userIds.length === 0) {
      return new Map();
    }
    const supabase = this.supabaseService.getAdminClient();
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", userIds);

    const map = new Map<string, string>();
    for (const profile of profiles ?? []) {
      map.set(profile.id, formatName(profile.first_name, profile.last_name));
    }
    return map;
  }
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, ISO_DATE_LENGTH);
}

function utcMidnightMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function extractTotalUsers(data: unknown): number {
  if (data === null || typeof data !== "object") {
    return 0;
  }
  const total = (data as { total?: unknown }).total;
  return typeof total === "number" ? total : 0;
}

function formatName(firstName: string | null, lastName: string | null): string {
  const joined = [firstName, lastName].filter(Boolean).join(" ").trim();
  return joined === "" ? UNKNOWN_USER_NAME : joined;
}

function initialiseTimelineBuckets(
  todayUtcMs: number,
  days: number,
): Map<string, ActivityTimelineEntry> {
  const buckets = new Map<string, ActivityTimelineEntry>();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = isoDate(new Date(todayUtcMs - offset * MS_PER_DAY));
    buckets.set(date, { date, signups: 0, goals: 0, messages: 0 });
  }
  return buckets;
}

function addToBucket(
  buckets: Map<string, ActivityTimelineEntry>,
  rows: Array<{ created_at: string | null }>,
  field: "signups" | "goals" | "messages",
): void {
  for (const row of rows) {
    if (row.created_at === null) {
      continue;
    }
    const date = row.created_at.slice(0, ISO_DATE_LENGTH);
    const bucket = buckets.get(date);
    if (bucket !== undefined) {
      bucket[field] += 1;
    }
  }
}
