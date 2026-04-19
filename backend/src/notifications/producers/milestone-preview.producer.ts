import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { COACH_BY_ID } from "../../coach/coaches.config.js";
import { SupabaseService } from "../../supabase/supabase.service.js";
import {
  milestonePreviewStub,
  resolveLanguage,
  type SupportedLanguage,
} from "../copy/fallbacks.js";
import { GateService } from "../gate/gate.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import {
  NOTIFICATION_KIND,
  NOTIFICATION_TIER,
} from "../outbox/outbox.types.js";
import {
  isInQuietHours,
  nextQuietHoursEnd,
  toLocalMoment,
} from "./local-time.js";
import { resolvePersonaBucket } from "./persona-defaults.js";

export interface MilestoneCompletedPayload {
  userId: string;
  milestoneId: string;
  goalId: string;
  completedAt: string;
}

const PREVIEW_DELAY_HOURS = 24;
const MS_PER_HOUR = 3_600_000;
const PREVIEW_DELAY_MS = PREVIEW_DELAY_HOURS * MS_PER_HOUR;
// Fallbacks mirror GateService when the profile has no explicit preference.
const DEFAULT_QUIET_START = 22;
const DEFAULT_QUIET_END = 7;
const DEFAULT_TIMEZONE = "UTC";
const MILESTONE_PREVIEW_CTA_PREFIX = "momentum://goal/";

interface ProfileContext {
  coachId: number | null;
  language: SupportedLanguage;
  timezone: string;
  quietStart: number;
  quietEnd: number;
}

interface NextMilestone {
  id: string;
  title: string;
  target_week: number;
  target_date: string | null;
}

@Injectable()
export class MilestonePreviewProducer {
  private readonly logger = new Logger(MilestonePreviewProducer.name);

  constructor(
    private readonly outbox: OutboxService,
    private readonly supabaseService: SupabaseService,
    private readonly gate: GateService,
  ) {}

  @OnEvent("milestone.completed")
  public async handle(payload: MilestoneCompletedPayload): Promise<void> {
    try {
      await this.enqueue(payload);
    } catch (error) {
      this.logger.error(
        `Failed to enqueue milestone_preview for milestone ${payload.milestoneId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async enqueue(payload: MilestoneCompletedPayload): Promise<void> {
    const completed = await this.loadCompletedMilestone(payload.milestoneId);
    if (completed === null) {
      this.logger.warn(
        `milestone_preview skipped — completed milestone ${payload.milestoneId} not found`,
      );
      return;
    }
    const next = await this.loadNextMilestone(payload.goalId, completed);
    if (next === null) {
      this.logger.log(
        `milestone_preview skipped — no uncompleted next milestone after ${payload.milestoneId}`,
      );
      return;
    }
    const profile = await this.loadProfile(payload.userId);
    const scheduledForUtc = this.computeScheduledUtc(
      payload.completedAt,
      profile,
    );
    const anyPrep = await this.countPrepTasks(next.id);
    const weeksAvailable = Math.max(
      0,
      next.target_week - completed.target_week,
    );
    const coach =
      profile.coachId === null ? undefined : COACH_BY_ID.get(profile.coachId);
    const { title, teaser } = milestonePreviewStub(
      profile.language,
      coach?.displayName[profile.language],
      next.title,
    );
    const persona = resolvePersonaBucket(profile.coachId);

    const decision = await this.gate.isPushAllowed(
      payload.userId,
      NOTIFICATION_KIND.MILESTONE_PREVIEW,
      scheduledForUtc,
    );
    if (!decision.allowed) {
      this.logger.debug(
        `Skipping milestone_preview for user ${payload.userId}: ${decision.reason ?? "unknown"}`,
      );
      return;
    }

    const kindSpecific = {
      next_milestone_id: next.id,
      next_milestone_name: next.title,
      weeks_available: weeksAvailable,
      any_prep_already_done: anyPrep > 0,
    };
    const result = await this.outbox.insert({
      userId: payload.userId,
      kind: NOTIFICATION_KIND.MILESTONE_PREVIEW,
      tier: NOTIFICATION_TIER.P2,
      dedupKey: `milestone_preview:${payload.milestoneId}`,
      scheduledForUtc,
      payload: {
        title,
        teaser,
        cta_deeplink: `${MILESTONE_PREVIEW_CTA_PREFIX}${payload.goalId}`,
        coach: coach === undefined ? { persona } : { id: coach.id, persona },
        kind_specific: kindSpecific,
        memory_hooks: {},
      },
      copyGen: {
        language: profile.language,
        coachId: profile.coachId,
        memoryHooks: {},
        kindSpecific,
        suppressStreakCopy: false,
      },
    });
    if (result.status === "inserted") {
      this.logger.log(
        `Enqueued milestone_preview job ${result.jobId} for milestone ${payload.milestoneId} → ${next.id}`,
      );
    }
  }

  private computeScheduledUtc(
    completedAt: string,
    profile: ProfileContext,
  ): Date {
    const base = new Date(new Date(completedAt).getTime() + PREVIEW_DELAY_MS);
    const localAtSlot = toLocalMoment(base, profile.timezone);
    if (
      !isInQuietHours(localAtSlot.hour, profile.quietStart, profile.quietEnd)
    ) {
      return base;
    }
    // Shift to the next occurrence of the user's configured quietEnd so the
    // producer-side shift agrees with the gate's quiet-hours check.
    return nextQuietHoursEnd(base, profile.timezone, profile.quietEnd);
  }

  private async loadCompletedMilestone(
    milestoneId: string,
  ): Promise<{ goal_id: string; target_week: number } | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("milestones")
      .select("goal_id, target_week")
      .eq("id", milestoneId)
      .maybeSingle();
    if (error !== null) {
      this.logger.error(
        `Failed to load completed milestone ${milestoneId}: ${error.message}`,
      );
      return null;
    }
    return data;
  }

  private async loadNextMilestone(
    goalId: string,
    completed: { target_week: number },
  ): Promise<NextMilestone | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("milestones")
      .select("id, title, target_week, target_date, completed_at")
      .eq("goal_id", goalId)
      .is("completed_at", null)
      .gt("target_week", completed.target_week)
      .order("target_week", { ascending: true })
      .limit(1);
    if (error !== null) {
      this.logger.error(
        `Failed to load next milestone for goal ${goalId}: ${error.message}`,
      );
      return null;
    }
    if (data.length === 0) {
      return null;
    }
    const row = data[0];
    if (row === undefined) {
      return null;
    }
    return {
      id: row.id,
      title: row.title,
      target_week: row.target_week,
      target_date: row.target_date,
    };
  }

  private async loadProfile(userId: string): Promise<ProfileContext> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "coach_id, language, timezone, notif_quiet_start, notif_quiet_end",
      )
      .eq("id", userId)
      .single();
    if (error !== null) {
      this.logger.warn(
        `Failed to load profile ${userId} for milestone_preview: ${error.message} — using defaults`,
      );
      return {
        coachId: null,
        language: "en",
        timezone: DEFAULT_TIMEZONE,
        quietStart: DEFAULT_QUIET_START,
        quietEnd: DEFAULT_QUIET_END,
      };
    }
    return {
      coachId: data.coach_id,
      language: resolveLanguage(data.language),
      timezone: data.timezone ?? DEFAULT_TIMEZONE,
      quietStart: data.notif_quiet_start ?? DEFAULT_QUIET_START,
      quietEnd: data.notif_quiet_end ?? DEFAULT_QUIET_END,
    };
  }

  private async countPrepTasks(nextMilestoneId: string): Promise<number> {
    const supabase = this.supabaseService.getAdminClient();
    const { count, error } = await supabase
      .from("weekly_tasks")
      .select("id, weekly_plans!inner(milestone_id)", {
        count: "exact",
        head: true,
      })
      .eq("weekly_plans.milestone_id", nextMilestoneId);
    if (error !== null) {
      this.logger.warn(
        `Failed to count prep tasks for milestone ${nextMilestoneId}: ${error.message} — treating as 0`,
      );
      return 0;
    }
    return count ?? 0;
  }
}
