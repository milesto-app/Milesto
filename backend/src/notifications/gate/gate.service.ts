import { Injectable, Logger } from "@nestjs/common";

import { SupabaseService } from "../../supabase/supabase.service.js";
import type { NotificationKind } from "../outbox/outbox.types.js";
import { isInQuietHours, toLocalMoment } from "../producers/local-time.js";

export type GateReason =
  | "user_disabled"
  | "global_paused"
  | "kind_disabled"
  | "kind_paused"
  | "quiet_hours"
  | "no_timezone";

export const BYPASS_QUIET_HOURS_KINDS: ReadonlySet<NotificationKind> = new Set([
  "coach_reply_ready",
  "streak_at_risk",
  "implementation_intention",
]);

const DEFAULT_QUIET_START = 22;
const DEFAULT_QUIET_END = 7;

export interface GateDecision {
  allowed: boolean;
  reason?: GateReason;
  timezone: string | null;
  quietStart: number;
  quietEnd: number;
}

interface GateContext {
  timezone: string | null;
  quietStart: number;
  quietEnd: number;
}

interface ProfileGateRow {
  notif_enabled: boolean;
  notif_preferences: unknown;
  notif_quiet_start: number | null;
  notif_quiet_end: number | null;
  timezone: string | null;
}

interface NotifPreferencesGlobal {
  paused_until?: string | null;
}

interface NotifPreferencesKind {
  enabled?: boolean | null;
  paused_until?: string | null;
}

@Injectable()
export class GateService {
  private readonly logger = new Logger(GateService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async isPushAllowed(
    userId: string,
    kind: NotificationKind,
    evaluationTime?: Date,
  ): Promise<GateDecision> {
    const profile = await this.fetchProfile(userId);
    const context: GateContext = {
      timezone: profile?.timezone ?? null,
      quietStart: profile?.notif_quiet_start ?? DEFAULT_QUIET_START,
      quietEnd: profile?.notif_quiet_end ?? DEFAULT_QUIET_END,
    };
    const now = evaluationTime ?? new Date();
    return this.evaluate(profile, kind, now, context);
  }

  private evaluate(
    profile: ProfileGateRow | null,
    kind: NotificationKind,
    now: Date,
    context: GateContext,
  ): GateDecision {
    if (profile === null || !profile.notif_enabled) {
      return this.deny("user_disabled", context);
    }
    const prefs = this.parsePreferences(profile.notif_preferences);
    const globalReason = this.checkGlobalPause(prefs.global, now);
    if (globalReason !== null) {
      return this.deny(globalReason, context);
    }
    const kindReason = this.checkKindPreferences(prefs.kinds[kind], now);
    if (kindReason !== null) {
      return this.deny(kindReason, context);
    }
    if (BYPASS_QUIET_HOURS_KINDS.has(kind)) {
      return this.allow(context);
    }
    const quietReason = this.checkQuietHours(now, context);
    if (quietReason !== null) {
      return this.deny(quietReason, context);
    }
    return this.allow(context);
  }

  private checkGlobalPause(
    global: NotifPreferencesGlobal | undefined,
    now: Date,
  ): GateReason | null {
    const pausedUntil = this.parseTimestamp(global?.paused_until);
    if (pausedUntil !== null && pausedUntil > now) {
      return "global_paused";
    }
    return null;
  }

  private checkKindPreferences(
    kindPrefs: NotifPreferencesKind | undefined,
    now: Date,
  ): GateReason | null {
    if (kindPrefs?.enabled === false) {
      return "kind_disabled";
    }
    const kindPausedUntil = this.parseTimestamp(kindPrefs?.paused_until);
    if (kindPausedUntil !== null && kindPausedUntil > now) {
      return "kind_paused";
    }
    return null;
  }

  private checkQuietHours(now: Date, context: GateContext): GateReason | null {
    if (context.timezone === null) {
      return "no_timezone";
    }
    const localHour = toLocalMoment(now, context.timezone).hour;
    if (isInQuietHours(localHour, context.quietStart, context.quietEnd)) {
      return "quiet_hours";
    }
    return null;
  }

  private allow(context: GateContext): GateDecision {
    return { allowed: true, ...context };
  }

  private deny(reason: GateReason, context: GateContext): GateDecision {
    return { allowed: false, reason, ...context };
  }

  private async fetchProfile(userId: string): Promise<ProfileGateRow | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "notif_enabled, notif_preferences, notif_quiet_start, notif_quiet_end, timezone",
      )
      .eq("id", userId)
      .maybeSingle();
    if (error !== null) {
      this.logger.error(
        `GateService failed to load profile for user ${userId}: ${error.message}`,
      );
      return null;
    }
    return data;
  }

  private parsePreferences(raw: unknown): {
    global?: NotifPreferencesGlobal;
    kinds: Record<string, NotifPreferencesKind | undefined>;
  } {
    if (typeof raw !== "object" || raw === null) {
      return { kinds: {} };
    }
    const obj = raw as Record<string, unknown>;
    const result: {
      global?: NotifPreferencesGlobal;
      kinds: Record<string, NotifPreferencesKind | undefined>;
    } = { kinds: {} };
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value !== "object" || value === null) {
        continue;
      }
      if (key === "global") {
        result.global = value as NotifPreferencesGlobal;
      } else {
        result.kinds[key] = value as NotifPreferencesKind;
      }
    }
    return result;
  }

  private parseTimestamp(value: string | null | undefined): Date | null {
    if (typeof value !== "string" || value.length === 0) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
