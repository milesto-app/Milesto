import { Injectable, Logger } from "@nestjs/common";

import { SupabaseService } from "../../supabase/supabase.service.js";
import { GateService } from "../gate/gate.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import {
  NOTIFICATION_KIND,
  NOTIFICATION_TIER,
} from "../outbox/outbox.types.js";
import {
  formatLocalDate,
  localToUtc,
  localWeekStartDate,
  toLocalMoment,
} from "../producers/local-time.js";
import { getPersonaDefaultHour } from "../producers/persona-defaults.js";

export const AT_RISK_SUNDAY_HOUR = 18;
const FIFTEEN_MIN_WINDOW = 15;
const SUNDAY_WEEKDAY = 0;
const MS_PER_DAY = 86_400_000;
const TENURE_GUARDRAIL_DAYS = 60;
const MIN_STREAK_WEEKS_FOR_AT_RISK = 2;
const DAYS_PER_WEEK = 7;

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
  last_extended_week: string | null;
  freeze_tokens: number;
}

@Injectable()
export class StreaksAtRiskService {
  private readonly logger = new Logger(StreaksAtRiskService.name);

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
      const targetHour = this.resolveHour(candidate.coach_id);
      const local = toLocalMoment(now, candidate.timezone);
      if (!this.isAtRiskSlot(local, targetHour)) {
        return;
      }
      await this.evaluateUser(candidate, local, now);
    } catch (error) {
      this.logger.error(
        `Streaks at-risk tick failed for user ${candidate.user_id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private resolveHour(coachId: number | null): number {
    return Math.max(getPersonaDefaultHour(coachId), AT_RISK_SUNDAY_HOUR);
  }

  private isAtRiskSlot(
    local: ReturnType<typeof toLocalMoment>,
    targetHour: number,
  ): boolean {
    const weekday = new Date(
      Date.UTC(local.year, local.month - 1, local.day),
    ).getUTCDay();
    return (
      weekday === SUNDAY_WEEKDAY &&
      local.hour === targetHour &&
      local.minute < FIFTEEN_MIN_WINDOW
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

  private async evaluateUser(
    candidate: UserCandidate,
    local: ReturnType<typeof toLocalMoment>,
    now: Date,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("user_streaks")
      .select(
        "id, user_id, goal_id, current_weeks, last_extended_week, freeze_tokens",
      )
      .eq("user_id", candidate.user_id);
    if (error !== null) {
      this.logger.error(
        `Failed to load user_streaks for ${candidate.user_id}: ${error.message}`,
      );
      return;
    }
    const thisWeek = localWeekStartDate(local);
    for (const streak of data) {
      if (!this.isAtRisk(streak, thisWeek)) {
        continue;
      }
      const hasIncomplete = await this.hasIncompleteTasks(
        candidate.user_id,
        streak.goal_id,
        candidate.timezone,
      );
      if (!hasIncomplete) {
        continue;
      }
      await this.enqueueAtRisk(candidate, streak, local, now);
    }
  }

  private isAtRisk(streak: StreakRow, thisWeek: string): boolean {
    if (streak.current_weeks < MIN_STREAK_WEEKS_FOR_AT_RISK) {
      return false;
    }
    if (streak.freeze_tokens !== 0) {
      return false;
    }
    if (streak.last_extended_week === thisWeek) {
      return false;
    }
    return true;
  }

  private async hasIncompleteTasks(
    userId: string,
    goalId: string,
    timezone: string,
  ): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("weekly_plans")
      .select("id, week_start_date, weekly_tasks(is_completed)")
      .eq("user_id", userId)
      .eq("goal_id", goalId)
      .eq("status", "active");
    if (error !== null) {
      this.logger.warn(
        `Failed to check incomplete tasks for ${userId}/${goalId}: ${error.message}`,
      );
      return false;
    }
    const nowLocal = toLocalMoment(new Date(), timezone);
    const todayUtc = Date.UTC(nowLocal.year, nowLocal.month - 1, nowLocal.day);
    for (const plan of data) {
      if (!this.planIsCurrent(plan.week_start_date, todayUtc)) {
        continue;
      }
      const tasks = plan.weekly_tasks as { is_completed: boolean }[];
      if (tasks.some((t) => !t.is_completed)) {
        return true;
      }
    }
    return false;
  }

  private planIsCurrent(weekStartDate: string, todayUtc: number): boolean {
    const startUtc = Date.parse(`${weekStartDate}T00:00:00.000Z`);
    if (Number.isNaN(startUtc)) {
      return false;
    }
    const endUtc = startUtc + DAYS_PER_WEEK * MS_PER_DAY;
    return startUtc <= todayUtc && todayUtc < endUtc;
  }

  private async enqueueAtRisk(
    candidate: UserCandidate,
    streak: StreakRow,
    local: ReturnType<typeof toLocalMoment>,
    now: Date,
  ): Promise<void> {
    const decision = await this.gate.isPushAllowed(
      candidate.user_id,
      NOTIFICATION_KIND.STREAK_AT_RISK,
    );
    if (!decision.allowed) {
      this.logger.debug(
        `Gate blocked streak_at_risk for ${candidate.user_id}/${streak.goal_id}: ${decision.reason ?? "unknown"}`,
      );
      return;
    }
    const localDate = formatLocalDate(local);
    const shouldSuppressCopy = this.shouldSuppressStreakCopy(
      candidate.tenure_start_date,
    );
    const scheduledForUtc = localToUtc(local, candidate.timezone);
    const targetUtc =
      scheduledForUtc.getTime() < now.getTime() ? now : scheduledForUtc;
    try {
      const result = await this.outbox.insert({
        userId: candidate.user_id,
        kind: NOTIFICATION_KIND.STREAK_AT_RISK,
        tier: NOTIFICATION_TIER.P1,
        dedupKey: `streak_at_risk:${candidate.user_id}:${streak.goal_id}:${localDate}`,
        scheduledForUtc: targetUtc,
        localDate,
        payload: {
          kind_specific: {
            goal_id: streak.goal_id,
            current_weeks: streak.current_weeks,
            freeze_tokens: streak.freeze_tokens,
            suppress_streak_copy: shouldSuppressCopy,
          },
          memory_hooks: {
            current_streak_weeks: streak.current_weeks,
          },
        },
      });
      if (result.status === "inserted") {
        this.logger.log(
          `Enqueued streak_at_risk job ${result.jobId} for ${candidate.user_id}/${streak.goal_id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to enqueue streak_at_risk for ${candidate.user_id}/${streak.goal_id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
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
