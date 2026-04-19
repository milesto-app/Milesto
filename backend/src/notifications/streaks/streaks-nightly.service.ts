import { Injectable, Logger } from "@nestjs/common";

import { SupabaseService } from "../../supabase/supabase.service.js";
import { GateService } from "../gate/gate.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import {
  NOTIFICATION_KIND,
  NOTIFICATION_TIER,
} from "../outbox/outbox.types.js";
import {
  localToUtc,
  localWeekStartDate,
  toLocalMoment,
} from "../producers/local-time.js";

export const SUNDAY_SWEEP_START_HOUR = 23;
export const FREEZE_REPLENISH_HOUR = 2;
const FIFTEEN_MIN_WINDOW = 15;
const SUNDAY_WEEKDAY = 0;
const FREEZE_TOKEN_CAP = 2;
const FREEZE_GRANT_INTERVAL_DAYS = 28;
const MS_PER_DAY = 86_400_000;
const MONDAY_PUSH_HOUR = 8;
const TENURE_GUARDRAIL_DAYS = 60;
const DAYS_PER_WEEK = 7;
const DATE_PAD_WIDTH = 2;

interface UserCandidate {
  user_id: string;
  timezone: string;
  coach_id: number | null;
  language: string;
  tenure_start_date: string | null;
}

interface StreakRow {
  id: string;
  user_id: string;
  goal_id: string;
  current_weeks: number;
  longest_weeks: number;
  last_extended_week: string | null;
  freeze_tokens: number;
  freezes_last_granted_at: string | null;
}

interface MinuteOfHour {
  hour: number;
  minute: number;
}

interface DayOfWeek {
  year: number;
  month: number;
  day: number;
}

@Injectable()
export class StreaksNightlyService {
  private readonly logger = new Logger(StreaksNightlyService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly outbox: OutboxService,
    private readonly gate: GateService,
  ) {}

  public async tick(now: Date): Promise<void> {
    const candidates = await this.fetchCandidates();
    if (candidates.length === 0) {
      return;
    }
    for (const candidate of candidates) {
      await this.processCandidate(candidate, now);
    }
  }

  private async processCandidate(
    candidate: UserCandidate,
    now: Date,
  ): Promise<void> {
    try {
      const local = toLocalMoment(now, candidate.timezone);
      if (this.isFreezeReplenishWindow(local)) {
        await this.runFreezeReplenish(candidate);
      }
      if (this.isSundayNightWindow(local)) {
        await this.runNightlyBrokenSweep(candidate, now);
      }
    } catch (error) {
      this.logger.error(
        `Streaks nightly tick failed for user ${candidate.user_id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private isSundayNightWindow(local: DayOfWeek & MinuteOfHour): boolean {
    const weekday = new Date(
      Date.UTC(local.year, local.month - 1, local.day),
    ).getUTCDay();
    return (
      weekday === SUNDAY_WEEKDAY &&
      local.hour === SUNDAY_SWEEP_START_HOUR &&
      local.minute < FIFTEEN_MIN_WINDOW
    );
  }

  private isFreezeReplenishWindow(local: MinuteOfHour): boolean {
    return (
      local.hour === FREEZE_REPLENISH_HOUR && local.minute < FIFTEEN_MIN_WINDOW
    );
  }

  private async fetchCandidates(): Promise<UserCandidate[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase.rpc("streak_user_candidates");
    if (error !== null) {
      this.logger.error(
        `Failed to fetch streak user candidates: ${error.message}`,
      );
      return [];
    }
    return data as unknown as UserCandidate[];
  }

  private async loadStreaks(userId: string): Promise<StreakRow[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("user_streaks")
      .select(
        "id, user_id, goal_id, current_weeks, longest_weeks, last_extended_week, freeze_tokens, freezes_last_granted_at",
      )
      .eq("user_id", userId);
    if (error !== null) {
      this.logger.error(
        `Failed to load user_streaks for ${userId}: ${error.message}`,
      );
      return [];
    }
    return data;
  }

  private async runFreezeReplenish(candidate: UserCandidate): Promise<void> {
    const streaks = await this.loadStreaks(candidate.user_id);
    if (streaks.length === 0) {
      return;
    }
    const now = new Date();
    for (const streak of streaks) {
      if (streak.freeze_tokens >= FREEZE_TOKEN_CAP) {
        continue;
      }
      if (!this.isFreezeEligible(streak.freezes_last_granted_at, now)) {
        continue;
      }
      await this.grantFreezeToken(streak, now);
    }
  }

  private isFreezeEligible(lastGrantedAt: string | null, now: Date): boolean {
    if (lastGrantedAt === null) {
      return true;
    }
    const lastMs = Date.parse(lastGrantedAt);
    if (Number.isNaN(lastMs)) {
      return true;
    }
    const days = Math.floor((now.getTime() - lastMs) / MS_PER_DAY);
    return days >= FREEZE_GRANT_INTERVAL_DAYS;
  }

  private async grantFreezeToken(streak: StreakRow, now: Date): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("user_streaks")
      .update({
        freeze_tokens: streak.freeze_tokens + 1,
        freezes_last_granted_at: now.toISOString(),
      })
      .eq("id", streak.id);
    if (error !== null) {
      this.logger.error(
        `Failed to grant freeze token on streak ${streak.id}: ${error.message}`,
      );
      return;
    }
    this.logger.log(
      `Granted freeze token to streak ${streak.id} (tokens=${String(streak.freeze_tokens + 1)})`,
    );
  }

  private async runNightlyBrokenSweep(
    candidate: UserCandidate,
    now: Date,
  ): Promise<void> {
    const streaks = await this.loadStreaks(candidate.user_id);
    if (streaks.length === 0) {
      return;
    }
    const local = toLocalMoment(now, candidate.timezone);
    const thisWeek = localWeekStartDate(local);
    for (const streak of streaks) {
      if (streak.current_weeks < 1) {
        continue;
      }
      if (streak.last_extended_week === thisWeek) {
        continue;
      }
      if (streak.freeze_tokens > 0) {
        await this.consumeFreezeToken(streak);
        continue;
      }
      await this.markBroken(streak);
      await this.enqueueStreakBroken(candidate, streak, now);
    }
  }

  private async consumeFreezeToken(streak: StreakRow): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("user_streaks")
      .update({ freeze_tokens: streak.freeze_tokens - 1 })
      .eq("id", streak.id);
    if (error !== null) {
      this.logger.error(
        `Failed to consume freeze token on streak ${streak.id}: ${error.message}`,
      );
      return;
    }
    this.logger.log(
      `Consumed freeze token on streak ${streak.id} (remaining=${String(streak.freeze_tokens - 1)})`,
    );
  }

  private async markBroken(streak: StreakRow): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("user_streaks")
      .update({ current_weeks: 0 })
      .eq("id", streak.id);
    if (error !== null) {
      this.logger.error(
        `Failed to mark streak ${streak.id} broken: ${error.message}`,
      );
    }
  }

  private async enqueueStreakBroken(
    candidate: UserCandidate,
    streak: StreakRow,
    now: Date,
  ): Promise<void> {
    const decision = await this.gate.isPushAllowed(
      candidate.user_id,
      NOTIFICATION_KIND.STREAK_BROKEN,
    );
    if (!decision.allowed) {
      this.logger.debug(
        `Gate blocked streak_broken for ${candidate.user_id}/${streak.goal_id}: ${decision.reason ?? "unknown"}`,
      );
      return;
    }
    const mondayLocalDate = this.nextMondayLocalDate(now, candidate.timezone);
    const parsed = this.parseLocalDate(mondayLocalDate);
    const scheduledForUtc = localToUtc(
      {
        ...parsed,
        hour: MONDAY_PUSH_HOUR,
        minute: 0,
      },
      candidate.timezone,
    );
    const shouldSuppressCopy = this.shouldSuppressStreakCopy(
      candidate.tenure_start_date,
    );
    try {
      const result = await this.outbox.insert({
        userId: candidate.user_id,
        kind: NOTIFICATION_KIND.STREAK_BROKEN,
        tier: NOTIFICATION_TIER.P1,
        dedupKey: `streak_broken:${candidate.user_id}:${streak.goal_id}:${mondayLocalDate}`,
        scheduledForUtc,
        localDate: mondayLocalDate,
        payload: {
          kind_specific: {
            goal_id: streak.goal_id,
            previous_weeks: streak.current_weeks,
            longest_weeks: streak.longest_weeks,
            suppress_streak_copy: shouldSuppressCopy,
          },
          memory_hooks: {
            previous_streak_weeks: streak.current_weeks,
            longest_streak_weeks: streak.longest_weeks,
          },
        },
      });
      if (result.status === "inserted") {
        this.logger.log(
          `Enqueued streak_broken job ${result.jobId} for ${candidate.user_id}/${streak.goal_id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to enqueue streak_broken for ${candidate.user_id}/${streak.goal_id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private nextMondayLocalDate(now: Date, timezone: string): string {
    const local = toLocalMoment(now, timezone);
    const baseUtc = Date.UTC(local.year, local.month - 1, local.day);
    const weekday = new Date(baseUtc).getUTCDay();
    const daysUntilMonday =
      weekday === SUNDAY_WEEKDAY
        ? 1
        : ((DAYS_PER_WEEK + 1 - weekday) % DAYS_PER_WEEK) + 1;
    const monday = new Date(baseUtc + daysUntilMonday * MS_PER_DAY);
    const pad = (n: number): string =>
      n.toString().padStart(DATE_PAD_WIDTH, "0");
    return `${String(monday.getUTCFullYear())}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`;
  }

  private parseLocalDate(date: string): DayOfWeek {
    const parts = date.split("-");
    return {
      year: Number.parseInt(parts[0] ?? "1970", 10),
      month: Number.parseInt(parts[1] ?? "1", 10),
      day: Number.parseInt(parts[2] ?? "1", 10),
    };
  }

  private shouldSuppressStreakCopy(tenureStartDate: string | null): boolean {
    if (tenureStartDate === null) {
      return false;
    }
    const tenureStart = Date.parse(`${tenureStartDate}T00:00:00.000Z`);
    if (Number.isNaN(tenureStart)) {
      return false;
    }
    const daysSince = Math.floor((Date.now() - tenureStart) / MS_PER_DAY);
    return daysSince < TENURE_GUARDRAIL_DAYS;
  }
}
