import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { COACH_BY_ID } from "../../coach/coaches.config.js";
import { SupabaseService } from "../../supabase/supabase.service.js";
import { GateService } from "../gate/gate.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import {
  NOTIFICATION_KIND,
  NOTIFICATION_TIER,
} from "../outbox/outbox.types.js";
import { resolvePersonaBucket } from "./persona-defaults.js";

export interface WeeklyPlanCompletedEvent {
  userId: string;
  goalId: string;
  planId: string;
}

const SUPPORTED_LANGUAGES = ["en", "fr"] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const TITLE_COPY: Readonly<Record<SupportedLanguage, string>> = {
  en: "Week wrapped up",
  fr: "Semaine bouclée",
};

const TEASER_COPY: Readonly<Record<SupportedLanguage, string>> = {
  en: "Another one in the bag — keep the streak going.",
  fr: "Encore une de faite — continue sur ta lancée.",
};

interface ProfileContext {
  coachId: number | null;
  language: SupportedLanguage;
}

function resolveLanguage(raw: string | null): SupportedLanguage {
  const value = raw ?? "en";
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
    ? (value as SupportedLanguage)
    : "en";
}

@Injectable()
export class WeekCelebrationProducer {
  private readonly logger = new Logger(WeekCelebrationProducer.name);

  constructor(
    private readonly outbox: OutboxService,
    private readonly gate: GateService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @OnEvent("weekly-plan.completed")
  public async handle(event: WeeklyPlanCompletedEvent): Promise<void> {
    try {
      await this.enqueue(event);
    } catch (error) {
      this.logger.error(
        `Failed to enqueue week_completed for plan ${event.planId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async enqueue(event: WeeklyPlanCompletedEvent): Promise<void> {
    const decision = await this.gate.isPushAllowed(
      event.userId,
      NOTIFICATION_KIND.WEEK_COMPLETED,
    );
    if (!decision.allowed && decision.reason !== "quiet_hours") {
      this.logger.debug(
        `week_completed gated for user ${event.userId}: ${decision.reason ?? "unknown"}`,
      );
      return;
    }
    const profile = await this.loadProfile(event.userId);
    const coach =
      profile.coachId === null ? undefined : COACH_BY_ID.get(profile.coachId);
    const persona = resolvePersonaBucket(profile.coachId);
    const title = TITLE_COPY[profile.language];
    const teaser = TEASER_COPY[profile.language];

    const result = await this.outbox.insert({
      userId: event.userId,
      kind: NOTIFICATION_KIND.WEEK_COMPLETED,
      tier: NOTIFICATION_TIER.P2,
      dedupKey: `week_completed:${event.planId}`,
      scheduledForUtc: new Date(),
      payload: {
        title,
        teaser,
        cta_deeplink: "momentum://plan",
        coach: coach === undefined ? { persona } : { id: coach.id, persona },
        kind_specific: {
          weekly_plan_id: event.planId,
          goal_id: event.goalId,
        },
        memory_hooks: {},
      },
    });
    if (result.status === "inserted") {
      this.logger.log(
        `Enqueued week_completed job ${result.jobId} for plan ${event.planId}`,
      );
    }
  }

  private async loadProfile(userId: string): Promise<ProfileContext> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("coach_id, language")
      .eq("id", userId)
      .single();
    if (error !== null) {
      this.logger.warn(
        `Failed to load profile ${userId} for week_completed: ${error.message} — using defaults`,
      );
      return { coachId: null, language: "en" };
    }
    return {
      coachId: data.coach_id,
      language: resolveLanguage(data.language),
    };
  }
}
