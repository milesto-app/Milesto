import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

import { COACH_BY_ID } from "../../coach/coaches.config.js";
import { SupabaseService } from "../../supabase/supabase.service.js";
import { GateService } from "../gate/gate.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import {
  NOTIFICATION_KIND,
  NOTIFICATION_TIER,
} from "../outbox/outbox.types.js";
import { computeNextDailyCheckInSlot } from "./local-time.js";
import {
  getPersonaDefaultHour,
  resolvePersonaBucket,
} from "./persona-defaults.js";

const SCHEDULE_EVERY_15_MIN = "*/15 * * * *";
const QUIET_HOURS_START_V1 = 22;
const QUIET_HOURS_END_V1 = 7;
const DAILY_CHECK_IN_CTA = "momentum://plan";

interface DailyCheckInCandidate {
  user_id: string;
  timezone: string;
  coach_id: number | null;
  language: string;
}

const SUPPORTED_LANGUAGES = ["en", "fr"] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const DAILY_CHECK_IN_TEASER: Readonly<Record<SupportedLanguage, string>> = {
  en: "Ready for today's plan?",
  fr: "Prêt pour le plan du jour ?",
};

const FALLBACK_COACH_TITLE: Readonly<Record<SupportedLanguage, string>> = {
  en: "Your coach",
  fr: "Ton coach",
};

function resolveLanguage(raw: string): SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(raw)
    ? (raw as SupportedLanguage)
    : "en";
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private inFlight = false;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly outbox: OutboxService,
    private readonly gate: GateService,
  ) {}

  @Cron(SCHEDULE_EVERY_15_MIN)
  public async tick(): Promise<void> {
    if (this.inFlight) {
      return;
    }
    this.inFlight = true;
    try {
      await this.scheduleDailyCheckIns();
    } catch (error) {
      this.logger.error(
        "Scheduler tick failed",
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.inFlight = false;
    }
  }

  private async scheduleDailyCheckIns(): Promise<void> {
    const candidates = await this.fetchDailyCheckInCandidates();
    if (candidates.length === 0) {
      return;
    }
    const now = new Date();
    let inserted = 0;
    let deduped = 0;
    for (const candidate of candidates) {
      const outcome = await this.enqueueDailyCheckIn(candidate, now);
      if (outcome === "inserted") {
        inserted += 1;
      } else if (outcome === "duplicate") {
        deduped += 1;
      }
    }
    if (inserted > 0 || deduped > 0) {
      this.logger.log(
        `Daily check-in scheduling: ${String(inserted)} inserted, ${String(deduped)} deduped (of ${String(candidates.length)} candidates)`,
      );
    }
  }

  private async fetchDailyCheckInCandidates(): Promise<
    DailyCheckInCandidate[]
  > {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase.rpc("daily_check_in_candidates");
    if (error !== null) {
      this.logger.error(
        `Failed to fetch daily_check_in candidates: ${error.message}`,
      );
      return [];
    }
    return data as DailyCheckInCandidate[];
  }

  private async enqueueDailyCheckIn(
    candidate: DailyCheckInCandidate,
    now: Date,
  ): Promise<"inserted" | "duplicate" | "failed"> {
    const targetHour = getPersonaDefaultHour(candidate.coach_id);
    const slot = computeNextDailyCheckInSlot({
      now,
      timezone: candidate.timezone,
      targetHour,
      quietStart: QUIET_HOURS_START_V1,
      quietEnd: QUIET_HOURS_END_V1,
    });
    const persona = resolvePersonaBucket(candidate.coach_id);
    const coach =
      candidate.coach_id === null
        ? undefined
        : COACH_BY_ID.get(candidate.coach_id);
    const language = resolveLanguage(candidate.language);
    const title =
      coach?.displayName[language] ?? FALLBACK_COACH_TITLE[language];
    const teaser = DAILY_CHECK_IN_TEASER[language];
    const decision = await this.gate.isPushAllowed(
      candidate.user_id,
      NOTIFICATION_KIND.DAILY_CHECK_IN,
      slot.utc,
    );
    if (!decision.allowed) {
      this.logger.debug(
        `Skipping daily_check_in for user ${candidate.user_id}: ${decision.reason ?? "unknown"}`,
      );
      return "failed";
    }
    try {
      const result = await this.outbox.insert({
        userId: candidate.user_id,
        kind: NOTIFICATION_KIND.DAILY_CHECK_IN,
        tier: NOTIFICATION_TIER.P2,
        dedupKey: `daily_check_in:${candidate.user_id}:${slot.localDate}`,
        scheduledForUtc: slot.utc,
        localDate: slot.localDate,
        payload: {
          title,
          teaser,
          cta_deeplink: DAILY_CHECK_IN_CTA,
          coach: coach === undefined ? { persona } : { id: coach.id, persona },
          kind_specific: {
            target_local_hour: slot.localHour,
            target_local_date: slot.localDate,
            timezone: candidate.timezone,
          },
          memory_hooks: {},
        },
      });
      return result.status;
    } catch (error) {
      this.logger.error(
        `Failed to enqueue daily_check_in for user ${candidate.user_id}`,
        error instanceof Error ? error.stack : undefined,
      );
      return "failed";
    }
  }
}
