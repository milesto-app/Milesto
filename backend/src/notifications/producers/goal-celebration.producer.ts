import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { COACH_BY_ID } from "../../coach/coaches.config.js";
import { SupabaseService } from "../../supabase/supabase.service.js";
import { PostCommitCopyGenRunner } from "../copy/post-commit-copy-gen.runner.js";
import { isWithinTenureGuardrail } from "../copy/tenure-guardrail.js";
import { GateService } from "../gate/gate.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import {
  NOTIFICATION_KIND,
  NOTIFICATION_TIER,
} from "../outbox/outbox.types.js";
import { resolvePersonaBucket } from "./persona-defaults.js";

export interface GoalCompletedEvent {
  goalId: string;
  userId: string;
}

const SUPPORTED_LANGUAGES = ["en", "fr"] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const TITLE_COPY: Readonly<Record<SupportedLanguage, string>> = {
  en: "Goal complete!",
  fr: "Objectif atteint !",
};

const TEASER_COPY: Readonly<Record<SupportedLanguage, string>> = {
  en: "You crossed the finish line. Take it in.",
  fr: "Tu as franchi la ligne d'arrivée. Savoure.",
};

interface ProfileContext {
  coachId: number | null;
  language: SupportedLanguage;
  tenureStartDate: string | null;
}

function resolveLanguage(raw: string | null): SupportedLanguage {
  const value = raw ?? "en";
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
    ? (value as SupportedLanguage)
    : "en";
}

@Injectable()
export class GoalCelebrationProducer {
  private readonly logger = new Logger(GoalCelebrationProducer.name);

  constructor(
    private readonly outbox: OutboxService,
    private readonly gate: GateService,
    private readonly supabaseService: SupabaseService,
    private readonly postCommitCopyGen: PostCommitCopyGenRunner,
  ) {}

  @OnEvent("goal.completed")
  public async handle(event: GoalCompletedEvent): Promise<void> {
    try {
      await this.enqueue(event);
    } catch (error) {
      this.logger.error(
        `Failed to enqueue goal_hit for goal ${event.goalId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async enqueue(event: GoalCompletedEvent): Promise<void> {
    const decision = await this.gate.isPushAllowed(
      event.userId,
      NOTIFICATION_KIND.GOAL_HIT,
    );
    if (!decision.allowed && decision.reason !== "quiet_hours") {
      this.logger.debug(
        `goal_hit gated for user ${event.userId}: ${decision.reason ?? "unknown"}`,
      );
      return;
    }
    const profile = await this.loadProfile(event.userId);
    const coach =
      profile.coachId === null ? undefined : COACH_BY_ID.get(profile.coachId);
    const persona = resolvePersonaBucket(profile.coachId);
    const title = TITLE_COPY[profile.language];
    const teaser = TEASER_COPY[profile.language];
    const shouldSuppressStreakCopy = isWithinTenureGuardrail(
      profile.tenureStartDate,
    );

    const kindSpecific = { goal_id: event.goalId };
    const result = await this.outbox.insert({
      userId: event.userId,
      kind: NOTIFICATION_KIND.GOAL_HIT,
      tier: NOTIFICATION_TIER.P2,
      dedupKey: `goal_hit:${event.goalId}`,
      scheduledForUtc: new Date(),
      payload: {
        title,
        teaser,
        cta_deeplink: `momentum://goal/${event.goalId}`,
        coach: coach === undefined ? { persona } : { id: coach.id, persona },
        kind_specific: kindSpecific,
        memory_hooks: {},
      },
      copyGen: {
        language: profile.language,
        coachId: profile.coachId,
        memoryHooks: {},
        kindSpecific,
        suppressStreakCopy: shouldSuppressStreakCopy,
        producerName: "goal-celebration",
      },
    });
    if (result.status === "inserted") {
      this.logger.log(
        `Enqueued goal_hit job ${result.jobId} for goal ${event.goalId}`,
      );
      this.postCommitCopyGen.runIfShortFuse({
        insertResult: result,
        kind: NOTIFICATION_KIND.GOAL_HIT,
        language: profile.language,
        coachId: profile.coachId,
        stub: { title, teaser },
        memoryHooks: {},
        kindSpecific,
        suppressStreakCopy: shouldSuppressStreakCopy,
      });
    }
  }

  private async loadProfile(userId: string): Promise<ProfileContext> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("coach_id, language, tenure_start_date")
      .eq("id", userId)
      .single();
    if (error !== null) {
      this.logger.warn(
        `Failed to load profile ${userId} for goal_hit: ${error.message} — using defaults`,
      );
      return { coachId: null, language: "en", tenureStartDate: null };
    }
    return {
      coachId: data.coach_id,
      language: resolveLanguage(data.language),
      tenureStartDate: data.tenure_start_date,
    };
  }
}
