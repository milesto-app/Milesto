import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { COACH_BY_ID } from "../../coach/coaches.config.js";
import { config } from "../../config/app.config.js";
import { SupabaseService } from "../../supabase/supabase.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import {
  NOTIFICATION_KIND,
  NOTIFICATION_TIER,
} from "../outbox/outbox.types.js";

export interface CoachReplyReadyPayload {
  userId: string;
  goalId: string;
  conversationId: string;
  messageId: string;
  content: string;
}

const TEASER_MAX_LENGTH = 140;
const SUPPORTED_LANGUAGES = ["en", "fr"] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

@Injectable()
export class CoachReplyProducer {
  private readonly logger = new Logger(CoachReplyProducer.name);

  constructor(
    private readonly outbox: OutboxService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @OnEvent("coach.reply.ready")
  public async handle(payload: CoachReplyReadyPayload): Promise<void> {
    const teaser = this.buildTeaser(payload.content);
    const { coachId, language } = await this.loadProfile(payload.userId);
    const coach =
      COACH_BY_ID.get(coachId) ?? COACH_BY_ID.get(config.coach.defaultCoachId);
    const title = coach?.displayName[language] ?? "Your coach";

    try {
      const result = await this.outbox.insert({
        userId: payload.userId,
        kind: NOTIFICATION_KIND.COACH_REPLY_READY,
        tier: NOTIFICATION_TIER.P0,
        dedupKey: `coach_reply_ready:${payload.messageId}`,
        scheduledForUtc: new Date(),
        payload: {
          title,
          teaser,
          cta_deeplink: `momentum://coach/reply/${payload.messageId}`,
          coach: coach
            ? { id: coach.id, persona: coach.personality }
            : undefined,
          kind_specific: {
            conversation_id: payload.conversationId,
            message_id: payload.messageId,
            goal_id: payload.goalId,
          },
        },
      });
      if (result.status === "inserted") {
        this.logger.log(
          `Enqueued coach_reply_ready job ${result.jobId} for message ${payload.messageId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to enqueue coach_reply_ready for message ${payload.messageId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private buildTeaser(content: string): string {
    const trimmed = content.trim();
    if (trimmed.length <= TEASER_MAX_LENGTH) {
      return trimmed;
    }
    return `${trimmed.slice(0, TEASER_MAX_LENGTH - 1).trimEnd()}…`;
  }

  private async loadProfile(
    userId: string,
  ): Promise<{ coachId: number; language: SupportedLanguage }> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("coach_id, language")
      .eq("id", userId)
      .single();
    if (error !== null) {
      return { coachId: config.coach.defaultCoachId, language: "en" };
    }
    const rawLang = data.language ?? "en";
    const language: SupportedLanguage = (
      SUPPORTED_LANGUAGES as readonly string[]
    ).includes(rawLang)
      ? (rawLang as SupportedLanguage)
      : "en";
    return {
      coachId: data.coach_id ?? config.coach.defaultCoachId,
      language,
    };
  }
}
