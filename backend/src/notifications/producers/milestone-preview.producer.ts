import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { COACH_BY_ID } from "../../coach/coaches.config.js";
import { SupabaseService } from "../../supabase/supabase.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import {
  NOTIFICATION_KIND,
  NOTIFICATION_TIER,
} from "../outbox/outbox.types.js";
import { isInQuietHours, localToUtc, toLocalMoment } from "./local-time.js";
import { resolvePersonaBucket } from "./persona-defaults.js";

export interface MilestoneCompletedPayload {
  userId: string;
  milestoneId: string;
  goalId: string;
  completedAt: string;
}

const SUPPORTED_LANGUAGES = ["en", "fr"] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const PREVIEW_DELAY_HOURS = 24;
const MS_PER_HOUR = 3_600_000;
const PREVIEW_DELAY_MS = PREVIEW_DELAY_HOURS * MS_PER_HOUR;
const QUIET_HOURS_START_V1 = 22;
const QUIET_HOURS_END_V1 = 7;
const QUIET_SHIFT_HOUR = 8;
const DEFAULT_TIMEZONE = "UTC";
const MILESTONE_PREVIEW_CTA_PREFIX = "momentum://goal/";

const FALLBACK_COACH_TITLE: Readonly<Record<SupportedLanguage, string>> = {
  en: "Your coach",
  fr: "Ton coach",
};

const TEASER_TEMPLATE: Readonly<Record<SupportedLanguage, string>> = {
  en: "Next up: ",
  fr: "La suite : ",
};

interface ProfileContext {
  coachId: number | null;
  language: SupportedLanguage;
  timezone: string;
}

interface NextMilestone {
  id: string;
  title: string;
  target_week: number;
  target_date: string | null;
}

function resolveLanguage(raw: string | null): SupportedLanguage {
  const value = raw ?? "en";
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
    ? (value as SupportedLanguage)
    : "en";
}

@Injectable()
export class MilestonePreviewProducer {
  private readonly logger = new Logger(MilestonePreviewProducer.name);

  constructor(
    private readonly outbox: OutboxService,
    private readonly supabaseService: SupabaseService,
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
      profile.timezone,
    );
    const anyPrep = await this.countPrepTasks(next.id);
    const weeksAvailable = Math.max(
      0,
      next.target_week - completed.target_week,
    );
    const coach =
      profile.coachId === null ? undefined : COACH_BY_ID.get(profile.coachId);
    const title =
      coach?.displayName[profile.language] ??
      FALLBACK_COACH_TITLE[profile.language];
    const teaser = `${TEASER_TEMPLATE[profile.language]}${next.title}`;
    const persona = resolvePersonaBucket(profile.coachId);

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
        kind_specific: {
          next_milestone_id: next.id,
          next_milestone_name: next.title,
          weeks_available: weeksAvailable,
          any_prep_already_done: anyPrep > 0,
        },
        memory_hooks: {},
      },
    });
    if (result.status === "inserted") {
      this.logger.log(
        `Enqueued milestone_preview job ${result.jobId} for milestone ${payload.milestoneId} → ${next.id}`,
      );
    }
  }

  private computeScheduledUtc(completedAt: string, timezone: string): Date {
    const base = new Date(new Date(completedAt).getTime() + PREVIEW_DELAY_MS);
    const localAtSlot = toLocalMoment(base, timezone);
    if (
      !isInQuietHours(
        localAtSlot.hour,
        QUIET_HOURS_START_V1,
        QUIET_HOURS_END_V1,
      )
    ) {
      return base;
    }
    const shifted = { ...localAtSlot, hour: QUIET_SHIFT_HOUR, minute: 0 };
    if (localAtSlot.hour >= QUIET_HOURS_START_V1) {
      const nextDayMs = Date.UTC(
        shifted.year,
        shifted.month - 1,
        shifted.day + 1,
        shifted.hour,
        shifted.minute,
        0,
      );
      const nextDay = new Date(nextDayMs);
      return localToUtc(
        {
          year: nextDay.getUTCFullYear(),
          month: nextDay.getUTCMonth() + 1,
          day: nextDay.getUTCDate(),
          hour: shifted.hour,
          minute: shifted.minute,
        },
        timezone,
      );
    }
    return localToUtc(shifted, timezone);
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
      .select("coach_id, language, timezone")
      .eq("id", userId)
      .single();
    if (error !== null) {
      this.logger.warn(
        `Failed to load profile ${userId} for milestone_preview: ${error.message} — using defaults`,
      );
      return { coachId: null, language: "en", timezone: DEFAULT_TIMEZONE };
    }
    return {
      coachId: data.coach_id,
      language: resolveLanguage(data.language),
      timezone: data.timezone ?? DEFAULT_TIMEZONE,
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
