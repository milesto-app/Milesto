import { Injectable, Logger } from "@nestjs/common";

import { COACH_BY_ID } from "../../coach/coaches.config.js";
import { SupabaseService } from "../../supabase/supabase.service.js";
import { GateService } from "../gate/gate.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import {
  NOTIFICATION_KIND,
  NOTIFICATION_TIER,
} from "../outbox/outbox.types.js";
import { computeNextWeekdayHourSlot } from "./local-time.js";
import { resolvePersonaBucket } from "./persona-defaults.js";

const SUPPORTED_LANGUAGES = ["en", "fr"] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const DAY_NAMES: Readonly<Record<SupportedLanguage, readonly string[]>> = {
  en: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  fr: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
};

const FALLBACK_COACH_TITLE: Readonly<Record<SupportedLanguage, string>> = {
  en: "Your coach",
  fr: "Ton coach",
};

const INTENTION_CTA_PREFIX = "momentum://task/";

interface IntentionCandidate {
  task_id: string;
  day_of_week: number;
  local_hour: number;
  location_label: string | null;
  task_title: string;
  user_id: string;
  timezone: string;
  language: string;
  coach_id: number | null;
}

function resolveLanguage(raw: string | null): SupportedLanguage {
  const value = raw ?? "en";
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
    ? (value as SupportedLanguage)
    : "en";
}

function buildTeaser(
  language: SupportedLanguage,
  dayName: string,
  hour: number,
  locationLabel: string | null,
  taskTitle: string,
): string {
  const hourText = `${String(hour)}h`;
  const locationSuffix = locationLabel === null ? "" : ` ${locationLabel}`;
  if (language === "fr") {
    return `C'est ${dayName} ${hourText}${locationSuffix} — ${taskTitle} t'attend.`;
  }
  return `It's ${dayName} ${hourText}${locationSuffix} — ${taskTitle} is waiting.`;
}

@Injectable()
export class IntentionProducer {
  private readonly logger = new Logger(IntentionProducer.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly outbox: OutboxService,
    private readonly gate: GateService,
  ) {}

  public async scheduleIntentions(now: Date): Promise<void> {
    const candidates = await this.fetchCandidates();
    if (candidates.length === 0) {
      return;
    }
    let inserted = 0;
    let deduped = 0;
    for (const candidate of candidates) {
      const outcome = await this.enqueueForCandidate(candidate, now);
      if (outcome === "inserted") {
        inserted += 1;
      } else if (outcome === "duplicate") {
        deduped += 1;
      }
    }
    if (inserted > 0 || deduped > 0) {
      this.logger.log(
        `Intention scheduling: ${String(inserted)} inserted, ${String(deduped)} deduped (of ${String(candidates.length)} candidates)`,
      );
    }
  }

  private async fetchCandidates(): Promise<IntentionCandidate[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("weekly_task_intentions")
      .select(
        "task_id, day_of_week, local_hour, location_label, weekly_tasks!inner(title, user_id, is_completed, profiles:user_id(timezone, language, coach_id, notif_enabled, notif_permission_status))",
      )
      .eq("weekly_tasks.is_completed", false);
    if (error !== null) {
      this.logger.error(
        `Failed to fetch intention candidates: ${error.message}`,
      );
      return [];
    }
    return this.mapCandidates(data);
  }

  private mapCandidates(rows: unknown): IntentionCandidate[] {
    if (!Array.isArray(rows)) {
      return [];
    }
    const mapped: IntentionCandidate[] = [];
    for (const raw of rows) {
      const candidate = this.toCandidate(raw);
      if (candidate !== null) {
        mapped.push(candidate);
      }
    }
    return mapped;
  }

  private toCandidate(raw: unknown): IntentionCandidate | null {
    const parts = this.extractCandidateParts(raw);
    if (parts === null) {
      return null;
    }
    const { row, task, profile } = parts;
    if (
      profile["notif_enabled"] !== true ||
      profile["notif_permission_status"] !== "granted"
    ) {
      return null;
    }
    const timezone = profile["timezone"];
    if (typeof timezone !== "string" || timezone === "") {
      return null;
    }
    return {
      task_id: String(row["task_id"]),
      day_of_week: Number(row["day_of_week"]),
      local_hour: Number(row["local_hour"]),
      location_label:
        typeof row["location_label"] === "string"
          ? row["location_label"]
          : null,
      task_title: String(task["title"]),
      user_id: String(task["user_id"]),
      timezone,
      language:
        typeof profile["language"] === "string" ? profile["language"] : "en",
      coach_id:
        typeof profile["coach_id"] === "number" ? profile["coach_id"] : null,
    };
  }

  private extractCandidateParts(raw: unknown): {
    row: Record<string, unknown>;
    task: Record<string, unknown>;
    profile: Record<string, unknown>;
  } | null {
    if (typeof raw !== "object" || raw === null) {
      return null;
    }
    const row = raw as Record<string, unknown>;
    const task = row["weekly_tasks"];
    if (typeof task !== "object" || task === null) {
      return null;
    }
    const taskObj = task as Record<string, unknown>;
    const profile = taskObj["profiles"];
    if (typeof profile !== "object" || profile === null) {
      return null;
    }
    return {
      row,
      task: taskObj,
      profile: profile as Record<string, unknown>,
    };
  }

  private async enqueueForCandidate(
    candidate: IntentionCandidate,
    now: Date,
  ): Promise<"inserted" | "duplicate" | "failed"> {
    const slot = computeNextWeekdayHourSlot({
      now,
      timezone: candidate.timezone,
      targetDayOfWeek: candidate.day_of_week,
      targetHour: candidate.local_hour,
    });
    const decision = await this.gate.isPushAllowed(
      candidate.user_id,
      NOTIFICATION_KIND.IMPLEMENTATION_INTENTION,
      slot.utc,
    );
    if (!decision.allowed) {
      this.logger.debug(
        `Skipping implementation_intention for task ${candidate.task_id}: ${decision.reason ?? "unknown"}`,
      );
      return "failed";
    }
    try {
      const result = await this.outbox.insert({
        userId: candidate.user_id,
        kind: NOTIFICATION_KIND.IMPLEMENTATION_INTENTION,
        tier: NOTIFICATION_TIER.P2,
        dedupKey: `implementation_intention:${candidate.task_id}:${slot.localDate}`,
        scheduledForUtc: slot.utc,
        localDate: slot.localDate,
        payload: this.buildPayload(candidate),
      });
      return result.status;
    } catch (error) {
      this.logger.error(
        `Failed to enqueue implementation_intention for task ${candidate.task_id}`,
        error instanceof Error ? error.stack : undefined,
      );
      return "failed";
    }
  }

  private buildPayload(candidate: IntentionCandidate): Record<string, unknown> {
    const language = resolveLanguage(candidate.language);
    const coach =
      candidate.coach_id === null
        ? undefined
        : COACH_BY_ID.get(candidate.coach_id);
    const title =
      coach?.displayName[language] ?? FALLBACK_COACH_TITLE[language];
    const persona = resolvePersonaBucket(candidate.coach_id);
    const dayName =
      DAY_NAMES[language][candidate.day_of_week] ??
      DAY_NAMES.en[candidate.day_of_week] ??
      "";
    const teaser = buildTeaser(
      language,
      dayName,
      candidate.local_hour,
      candidate.location_label,
      candidate.task_title,
    );
    return {
      title,
      teaser,
      cta_deeplink: `${INTENTION_CTA_PREFIX}${candidate.task_id}`,
      coach: coach === undefined ? { persona } : { id: coach.id, persona },
      kind_specific: {
        task_id: candidate.task_id,
        task_title: candidate.task_title,
        day_of_week: candidate.day_of_week,
        local_hour: candidate.local_hour,
        location_label: candidate.location_label,
      },
      memory_hooks: {},
    };
  }
}
