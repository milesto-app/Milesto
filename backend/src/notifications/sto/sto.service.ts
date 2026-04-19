import { Injectable, Logger } from "@nestjs/common";

import { SupabaseService } from "../../supabase/supabase.service.js";
import type { NotificationKind } from "../outbox/outbox.types.js";
import { getPersonaDefaultHour } from "../producers/persona-defaults.js";

const MIN_DISTINCT_DAYS = 7;
const WHIPLASH_MIN_DELTA_HOURS = 2;
const WHIPLASH_STALE_AGE_DAYS = 14;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const MS_PER_DAY =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
const STREAK_AT_RISK_FLOOR_HOUR = 18;
const HOUR_MIN = 0;
const HOUR_MAX = 23;

type StoDrivenKind = "daily_check_in" | "streak_at_risk" | "coach_proactive";

interface ProfileStoRow {
  coach_id: number | null;
  sto_active_hour: number | null;
  sto_active_hour_updated_at: string | null;
}

interface StoDecision {
  newHour: number;
  storedHour: number | null;
  shouldUpdate: boolean;
  reason: "no_stored" | "delta_large" | "stored_stale" | "stable";
}

@Injectable()
export class StoService {
  private readonly logger = new Logger(StoService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async computeActiveHour(userId: string): Promise<number | null> {
    const stats = await this.fetchActivityStats(userId);
    if (stats === null || stats.distinctDays < MIN_DISTINCT_DAYS) {
      return null;
    }
    const hour = this.pickDominantHour(stats.hourDistribution);
    if (hour === null) {
      return null;
    }
    const profile = await this.fetchProfile(userId);
    const decision = this.evaluateWhiplash(
      hour,
      profile?.sto_active_hour ?? null,
      profile?.sto_active_hour_updated_at ?? null,
      new Date(),
    );
    if (decision.shouldUpdate) {
      await this.persistActiveHour(userId, hour);
    }
    return hour;
  }

  public async getEffectiveTargetHour(
    userId: string,
    kind: StoDrivenKind,
  ): Promise<number> {
    const profile = await this.fetchProfile(userId);
    const storedHour = profile?.sto_active_hour ?? null;
    const fallback = getPersonaDefaultHour(profile?.coach_id ?? null);
    return this.resolveTargetHour(kind, storedHour, fallback);
  }

  public evaluateWhiplash(
    newHour: number,
    storedHour: number | null,
    storedUpdatedAt: string | null,
    now: Date,
  ): StoDecision {
    if (storedHour === null) {
      return {
        newHour,
        storedHour,
        shouldUpdate: true,
        reason: "no_stored",
      };
    }
    const delta = Math.abs(newHour - storedHour);
    if (delta >= WHIPLASH_MIN_DELTA_HOURS) {
      return { newHour, storedHour, shouldUpdate: true, reason: "delta_large" };
    }
    if (this.isStoredStale(storedUpdatedAt, now)) {
      return {
        newHour,
        storedHour,
        shouldUpdate: true,
        reason: "stored_stale",
      };
    }
    return { newHour, storedHour, shouldUpdate: false, reason: "stable" };
  }

  private resolveTargetHour(
    kind: StoDrivenKind,
    storedHour: number | null,
    fallbackHour: number,
  ): number {
    if (kind === "streak_at_risk") {
      const base = storedHour ?? fallbackHour;
      return Math.max(base, STREAK_AT_RISK_FLOOR_HOUR);
    }
    if (kind === "coach_proactive") {
      return storedHour ?? fallbackHour;
    }
    return storedHour ?? fallbackHour;
  }

  private async fetchActivityStats(
    userId: string,
  ): Promise<{ distinctDays: number; hourDistribution: unknown } | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase.rpc("sto_activity_stats", {
      p_user_id: userId,
    });
    if (error !== null) {
      this.logger.error(
        `STO stats lookup failed for user ${userId}: ${error.message}`,
      );
      return null;
    }
    const row = Array.isArray(data) ? data[0] : null;
    if (row === null || row === undefined) {
      return null;
    }
    return {
      distinctDays: row.distinct_days,
      hourDistribution: row.hour_distribution,
    };
  }

  private async fetchProfile(userId: string): Promise<ProfileStoRow | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("coach_id, sto_active_hour, sto_active_hour_updated_at")
      .eq("id", userId)
      .maybeSingle();
    if (error !== null) {
      this.logger.error(
        `STO profile fetch failed for user ${userId}: ${error.message}`,
      );
      return null;
    }
    return data;
  }

  private async persistActiveHour(userId: string, hour: number): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        sto_active_hour: hour,
        sto_active_hour_updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (error !== null) {
      this.logger.error(
        `STO persist failed for user ${userId}: ${error.message}`,
      );
    }
  }

  private pickDominantHour(distribution: unknown): number | null {
    if (typeof distribution !== "object" || distribution === null) {
      return null;
    }
    let bestHour: number | null = null;
    let bestCount = -1;
    for (const [rawHour, rawCount] of Object.entries(
      distribution as Record<string, unknown>,
    )) {
      const parsed = this.parseHourCount(rawHour, rawCount);
      if (parsed === null) {
        continue;
      }
      if (parsed.count > bestCount) {
        bestCount = parsed.count;
        bestHour = parsed.hour;
      }
    }
    return bestHour;
  }

  private parseHourCount(
    rawHour: string,
    rawCount: unknown,
  ): { hour: number; count: number } | null {
    const hour = Number.parseInt(rawHour, 10);
    const count = typeof rawCount === "number" ? rawCount : Number(rawCount);
    if (!Number.isFinite(hour) || hour < HOUR_MIN || hour > HOUR_MAX) {
      return null;
    }
    if (!Number.isFinite(count)) {
      return null;
    }
    return { hour, count };
  }

  private isStoredStale(storedUpdatedAt: string | null, now: Date): boolean {
    if (storedUpdatedAt === null) {
      return true;
    }
    const parsed = new Date(storedUpdatedAt);
    if (Number.isNaN(parsed.getTime())) {
      return true;
    }
    const ageDays = (now.getTime() - parsed.getTime()) / MS_PER_DAY;
    return ageDays > WHIPLASH_STALE_AGE_DAYS;
  }
}

export type StoKind = StoDrivenKind;

export function isStoDrivenKind(kind: NotificationKind): kind is StoDrivenKind {
  return (
    kind === "daily_check_in" ||
    kind === "streak_at_risk" ||
    kind === "coach_proactive"
  );
}
