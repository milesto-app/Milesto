import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { SupabaseService } from "../../supabase/supabase.service.js";
import { GateService } from "../gate/gate.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import {
  NOTIFICATION_KIND,
  NOTIFICATION_TIER,
} from "../outbox/outbox.types.js";
import {
  localWeekStartDate,
  previousLocalWeekStartDate,
  toLocalMoment,
} from "../producers/local-time.js";

export interface TaskCompletedPayload {
  userId: string;
  taskId: string;
  goalId: string;
  weeklyPlanId: string;
  completedAt: string;
}

const MILESTONE_WEEK_1 = 4;
const MILESTONE_WEEK_2 = 8;
const MILESTONE_WEEK_3 = 12;
const MILESTONE_WEEK_4 = 26;
const MILESTONE_WEEK_5 = 52;

export const STREAK_MILESTONE_WEEKS = [
  MILESTONE_WEEK_1,
  MILESTONE_WEEK_2,
  MILESTONE_WEEK_3,
  MILESTONE_WEEK_4,
  MILESTONE_WEEK_5,
] as const;
export type StreakMilestoneWeek = (typeof STREAK_MILESTONE_WEEKS)[number];

const DEFAULT_TIMEZONE = "UTC";
const TENURE_GUARDRAIL_DAYS = 60;
const MS_PER_DAY = 86_400_000;
const LOCAL_DATE_PAD_WIDTH = 2;

interface StreakRow {
  id: string;
  current_weeks: number;
  longest_weeks: number;
  last_extended_week: string | null;
  freeze_tokens: number;
}

interface UserStreakContext {
  timezone: string;
  tenureStartDate: string | null;
}

const MILESTONE_FALLBACK_TITLE = "Momentum";
const MILESTONE_FALLBACK_TEASER = "Weekly streak extended.";

@Injectable()
export class StreaksService {
  private readonly logger = new Logger(StreaksService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly outbox: OutboxService,
    private readonly gate: GateService,
  ) {}

  @OnEvent("task.completed")
  public async handleTaskCompleted(
    payload: TaskCompletedPayload,
  ): Promise<void> {
    try {
      await this.evaluateOnTaskCompleted(
        payload.userId,
        payload.goalId,
        new Date(payload.completedAt),
      );
    } catch (error) {
      this.logger.error(
        `Streak evaluation failed for user ${payload.userId} goal ${payload.goalId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  public async evaluateOnTaskCompleted(
    userId: string,
    goalId: string,
    completedAt: Date,
  ): Promise<void> {
    const context = await this.loadUserContext(userId);
    if (context === null) {
      return;
    }
    const local = toLocalMoment(completedAt, context.timezone);
    const thisWeek = localWeekStartDate(local);
    const prevWeek = previousLocalWeekStartDate(local);
    const streak = await this.upsertStreak(userId, goalId);
    if (streak === null) {
      return;
    }
    if (streak.last_extended_week === thisWeek) {
      return;
    }
    const nextCurrent =
      streak.last_extended_week === prevWeek ? streak.current_weeks + 1 : 1;
    const nextLongest = Math.max(streak.longest_weeks, nextCurrent);
    const didExtend = await this.applyExtension(
      streak.id,
      nextCurrent,
      nextLongest,
      thisWeek,
      completedAt,
    );
    if (!didExtend) {
      return;
    }
    if (this.isMilestoneWeek(nextCurrent)) {
      await this.enqueueMilestone(userId, goalId, nextCurrent, context, local);
    }
  }

  private isMilestoneWeek(weeks: number): weeks is StreakMilestoneWeek {
    return (STREAK_MILESTONE_WEEKS as readonly number[]).includes(weeks);
  }

  private async loadUserContext(
    userId: string,
  ): Promise<UserStreakContext | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("timezone, tenure_start_date")
      .eq("id", userId)
      .maybeSingle();
    if (error !== null) {
      this.logger.error(
        `Failed to load profile ${userId} for streak eval: ${error.message}`,
      );
      return null;
    }
    if (data === null) {
      return null;
    }
    return {
      timezone: data.timezone ?? DEFAULT_TIMEZONE,
      tenureStartDate: data.tenure_start_date,
    };
  }

  private async upsertStreak(
    userId: string,
    goalId: string,
  ): Promise<StreakRow | null> {
    const supabase = this.supabaseService.getAdminClient();
    const existing = await supabase
      .from("user_streaks")
      .select(
        "id, current_weeks, longest_weeks, last_extended_week, freeze_tokens",
      )
      .eq("user_id", userId)
      .eq("goal_id", goalId)
      .maybeSingle();
    if (existing.error !== null) {
      this.logger.error(
        `Failed to load user_streak ${userId}/${goalId}: ${existing.error.message}`,
      );
      return null;
    }
    if (existing.data !== null) {
      return existing.data;
    }
    const inserted = await supabase
      .from("user_streaks")
      .insert({ user_id: userId, goal_id: goalId })
      .select(
        "id, current_weeks, longest_weeks, last_extended_week, freeze_tokens",
      )
      .single();
    if (inserted.error !== null) {
      this.logger.error(
        `Failed to insert user_streak ${userId}/${goalId}: ${inserted.error.message}`,
      );
      return null;
    }
    return inserted.data;
  }

  private async applyExtension(
    streakId: string,
    nextCurrent: number,
    nextLongest: number,
    thisWeek: string,
    completedAt: Date,
  ): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("user_streaks")
      .update({
        current_weeks: nextCurrent,
        longest_weeks: nextLongest,
        last_extended_week: thisWeek,
        last_extended_at: completedAt.toISOString(),
      })
      .eq("id", streakId);
    if (error !== null) {
      this.logger.error(
        `Failed to extend user_streak ${streakId}: ${error.message}`,
      );
      return false;
    }
    return true;
  }

  private async enqueueMilestone(
    userId: string,
    goalId: string,
    weeks: number,
    context: UserStreakContext,
    localAtEvaluation: ReturnType<typeof toLocalMoment>,
  ): Promise<void> {
    const decision = await this.gate.isPushAllowed(
      userId,
      NOTIFICATION_KIND.STREAK_MILESTONE,
    );
    if (!decision.allowed) {
      this.logger.debug(
        `Gate blocked streak_milestone for ${userId}/${goalId} (weeks=${String(weeks)}): ${decision.reason ?? "unknown"}`,
      );
      return;
    }
    const shouldSuppressCopy = this.shouldSuppressStreakCopy(
      context.tenureStartDate,
    );
    const pad = (n: number): string =>
      n.toString().padStart(LOCAL_DATE_PAD_WIDTH, "0");
    const localDate = `${String(localAtEvaluation.year)}-${pad(localAtEvaluation.month)}-${pad(localAtEvaluation.day)}`;
    try {
      const result = await this.outbox.insert({
        userId,
        kind: NOTIFICATION_KIND.STREAK_MILESTONE,
        tier: NOTIFICATION_TIER.P2,
        dedupKey: `streak_milestone:${userId}:${goalId}:${String(weeks)}`,
        scheduledForUtc: new Date(),
        localDate,
        payload: {
          title: MILESTONE_FALLBACK_TITLE,
          teaser: MILESTONE_FALLBACK_TEASER,
          kind_specific: {
            goal_id: goalId,
            weeks,
            suppress_streak_copy: shouldSuppressCopy,
          },
          memory_hooks: {},
        },
      });
      if (result.status === "inserted") {
        this.logger.log(
          `Enqueued streak_milestone job ${result.jobId} for ${userId}/${goalId} (weeks=${String(weeks)})`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to enqueue streak_milestone for ${userId}/${goalId}`,
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
