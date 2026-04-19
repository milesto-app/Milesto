import { randomUUID } from "node:crypto";

import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import type { Database } from "../../supabase/database.types.js";
import { SupabaseService } from "../../supabase/supabase.service.js";
import { computeCopyInputHash } from "../copy/copy-input-hash.js";
import { resolveLanguage, type SupportedLanguage } from "../copy/fallbacks.js";
import { DeliveryTelemetryService } from "../deliveries/delivery-telemetry.service.js";
import { GateService } from "../gate/gate.service.js";
import { NotificationsService } from "../notifications.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import {
  NOTIFICATION_KIND,
  NOTIFICATION_TIER,
  type NotificationKind,
} from "../outbox/outbox.types.js";
import { nextQuietHoursEnd } from "../producers/local-time.js";
import { recheckPredicate } from "./predicates.js";

type NotificationJobRow =
  Database["public"]["Tables"]["notification_jobs"]["Row"];
type CopyGenerationRow =
  Database["public"]["Tables"]["notification_copy_generations"]["Row"];

type SendSource = "stub" | "generated";

interface RenderedPayload {
  title: string;
  body: string;
  data: Record<string, string>;
  sendSource: SendSource;
}

const MAX_JOB_AGE_HOURS = 2;
const MS_PER_HOUR = 3_600_000;
const STALE_JOB_MAX_AGE_MS = MAX_JOB_AGE_HOURS * MS_PER_HOUR;
const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 500;
const GLOBAL_CEILING_MAX_SENDS = 2;
const GLOBAL_CEILING_WINDOW_HOURS = 24;
const GLOBAL_CEILING_WINDOW_MS = GLOBAL_CEILING_WINDOW_HOURS * MS_PER_HOUR;
const GLOBAL_CEILING_RESCHEDULE_THRESHOLD_HOURS = 2;
const GLOBAL_CEILING_RESCHEDULE_THRESHOLD_MS =
  GLOBAL_CEILING_RESCHEDULE_THRESHOLD_HOURS * MS_PER_HOUR;
const GLOBAL_CEILING_SKIP_REASON = "global_ceiling";
const GLOBAL_CEILING_CELEBRATION_SKIP_REASON = "global_ceiling_celebration";

// Celebration kinds skip winner-selection/Phase-B grouping per §8.1. They send
// directly after Phase A and remain subject only to the global ceiling (§8.5).
const CELEBRATION_KINDS: ReadonlySet<string> = new Set([
  "milestone_hit",
  "goal_hit",
  "week_completed",
]);

// Phase-B winner rank (§3.3 of notification-detection-design.md). Earlier in
// the list = higher priority. Kinds not in the list lose any tie and will be
// suppressed if they compete against a ranked sibling on the same local day.
const PHASE_B_RANK_ORDER: readonly string[] = [
  NOTIFICATION_KIND.STREAK_BROKEN,
  NOTIFICATION_KIND.IMPLEMENTATION_INTENTION,
  NOTIFICATION_KIND.DAILY_CHECK_IN,
  NOTIFICATION_KIND.WEEK_COMPLETION_GAP,
  NOTIFICATION_KIND.MILESTONE_COUNTDOWN,
  NOTIFICATION_KIND.MILESTONE_PREVIEW,
  NOTIFICATION_KIND.GOAL_DEADLINE_COUNTDOWN,
  NOTIFICATION_KIND.STALE_TASKS,
  NOTIFICATION_KIND.WINBACK_STEP,
  NOTIFICATION_KIND.UNEXPECTED_WIN,
];
const PHASE_B_RANK: ReadonlyMap<string, number> = new Map(
  PHASE_B_RANK_ORDER.map((kind, index) => [kind, index]),
);
const PHASE_B_WINNER_SKIP_REASON = "phase_b_winner_selected";

interface PhaseBSelection {
  survivors: NotificationJobRow[];
  losers: NotificationJobRow[];
}

@Injectable()
export class DispatcherService {
  private readonly logger = new Logger(DispatcherService.name);
  private readonly workerId = `dispatcher-${randomUUID()}`;
  private inFlight = false;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly outbox: OutboxService,
    private readonly deliveryTelemetry: DeliveryTelemetryService,
    private readonly gate: GateService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  public async drain(): Promise<void> {
    if (this.inFlight) {
      return;
    }
    this.inFlight = true;
    try {
      const survivors = await this.claimAndFilter();
      if (survivors.length === 0) {
        return;
      }
      const generations = await this.loadGenerations(survivors);
      await this.dispatchWithPerUserSerialization(survivors, generations);
    } catch (error) {
      this.logger.error(
        "Dispatcher drain failed",
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.inFlight = false;
    }
  }

  private async claimAndFilter(): Promise<NotificationJobRow[]> {
    const jobs = await this.claim();
    if (jobs.length === 0) {
      return [];
    }
    this.logger.log(
      `Claimed ${String(jobs.length)} notification jobs (worker=${this.workerId})`,
    );
    const { survivors, losers } = this.selectPhaseBWinners(jobs);
    if (losers.length > 0) {
      await this.skipPhaseBLosers(losers);
    }
    return survivors;
  }

  private async dispatchWithPerUserSerialization(
    jobs: NotificationJobRow[],
    generations: Map<string, CopyGenerationRow>,
  ): Promise<void> {
    // Serialize dispatches per user so the global 2/day ceiling check
    // (which reads send history) cannot race against a concurrent sibling
    // for the same user in the same batch. Cross-user dispatches still run
    // in parallel. Each step swallows its own rejection so an unexpected
    // throw on one job does not cancel the user's remaining jobs.
    const userChains = new Map<string, Promise<void>>();
    for (const job of jobs) {
      const prev = userChains.get(job.user_id) ?? Promise.resolve();
      const generation =
        job.copy_generation_id === null
          ? null
          : (generations.get(job.copy_generation_id) ?? null);
      const next = prev.then(async () => {
        try {
          await this.dispatch(job, generation);
        } catch (error) {
          this.logger.error(
            `Unhandled error dispatching job ${job.id} (user=${job.user_id})`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      });
      userChains.set(job.user_id, next);
    }
    await Promise.all(userChains.values());
  }

  /**
   * Group claimed non-celebration P2/P3 jobs by (user_id, local_date) and
   * pick one winner per group via PHASE_B_RANK. Losers are removed from the
   * dispatch flow and skipped with `phase_b_winner_selected`. Celebrations,
   * P0/P1, and unknown-tier jobs pass through untouched.
   *
   * Tie-breaker order: rank → earliest scheduled_for_utc → lexicographic id.
   */
  private selectPhaseBWinners(jobs: NotificationJobRow[]): PhaseBSelection {
    const passthrough: NotificationJobRow[] = [];
    const groups = new Map<string, NotificationJobRow[]>();
    for (const job of jobs) {
      if (this.isPhaseBCompetitor(job)) {
        const key = `${job.user_id}|${job.local_date ?? "null"}`;
        const bucket = groups.get(key) ?? [];
        bucket.push(job);
        groups.set(key, bucket);
      } else {
        passthrough.push(job);
      }
    }
    if (groups.size === 0) {
      return { survivors: passthrough, losers: [] };
    }
    const winners: NotificationJobRow[] = [];
    const losers: NotificationJobRow[] = [];
    for (const bucket of groups.values()) {
      if (bucket.length === 1) {
        winners.push(bucket[0] as NotificationJobRow);
        continue;
      }
      const [winner, ...rest] = [...bucket].sort(comparePhaseBCandidates);
      winners.push(winner as NotificationJobRow);
      losers.push(...rest);
    }
    return { survivors: [...passthrough, ...winners], losers };
  }

  private isPhaseBCompetitor(job: NotificationJobRow): boolean {
    if (CELEBRATION_KINDS.has(job.kind)) {
      return false;
    }
    return (
      job.tier === NOTIFICATION_TIER.P2 || job.tier === NOTIFICATION_TIER.P3
    );
  }

  private async skipPhaseBLosers(losers: NotificationJobRow[]): Promise<void> {
    await Promise.all(
      losers.map(async (loser) => {
        await this.outbox.markSkipped(loser.id, PHASE_B_WINNER_SKIP_REASON);
        this.logger.log(
          `Phase-B suppressed job ${loser.id} (kind=${loser.kind}, user=${loser.user_id}, local_date=${loser.local_date ?? "null"})`,
        );
      }),
    );
  }

  private async claim(): Promise<NotificationJobRow[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase.rpc("claim_notification_jobs", {
      p_worker_id: this.workerId,
      p_batch_size: BATCH_SIZE,
    });
    if (error !== null) {
      this.logger.error(`Failed to claim jobs: ${error.message}`);
      return [];
    }
    return data;
  }

  private async loadGenerations(
    jobs: NotificationJobRow[],
  ): Promise<Map<string, CopyGenerationRow>> {
    const ids = jobs
      .map((j) => j.copy_generation_id)
      .filter((id): id is string => id !== null);
    if (ids.length === 0) {
      return new Map();
    }
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("notification_copy_generations")
      .select("*")
      .in("id", ids);
    if (error !== null) {
      this.logger.warn(
        `Failed to bulk-load copy generations for ${String(ids.length)} jobs: ${error.message} — falling back to stubs`,
      );
      return new Map();
    }
    const map = new Map<string, CopyGenerationRow>();
    for (const row of data) {
      map.set(row.id, row);
    }
    return map;
  }

  private async dispatch(
    job: NotificationJobRow,
    generation: CopyGenerationRow | null,
  ): Promise<void> {
    if (this.isStale(job)) {
      await this.outbox.markSkipped(job.id, "stale");
      return;
    }

    if (await this.alreadyAccepted(job.id)) {
      this.logger.warn(
        `Job ${job.id} already has an accepted delivery — skipping APNs re-send (markSent retry path)`,
      );
      await this.outbox.markSent(job.id);
      return;
    }

    const recheck = await recheckPredicate(job, this.supabaseService);
    if (!recheck.valid) {
      await this.outbox.markSkipped(job.id, recheck.reason);
      return;
    }

    if (!(await this.passesGate(job))) {
      return;
    }

    if ((await this.applyGlobalCeiling(job)) === "blocked") {
      return;
    }

    try {
      await this.dispatchAndRecord(job, generation);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.recordFailure(job, message);
    }
  }

  private async passesGate(job: NotificationJobRow): Promise<boolean> {
    const decision = await this.gate.isPushAllowed(
      job.user_id,
      job.kind as NotificationKind,
    );
    if (decision.allowed) {
      return true;
    }
    if (decision.reason === "quiet_hours" && decision.timezone !== null) {
      await this.deferForQuietHours(job, decision.timezone, decision.quietEnd);
      return false;
    }
    await this.outbox.markSkipped(job.id, decision.reason ?? "gate_denied");
    return false;
  }

  private async applyGlobalCeiling(
    job: NotificationJobRow,
  ): Promise<"allowed" | "blocked"> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase.rpc("recent_sends_window", {
      p_user_id: job.user_id,
      p_window_hours: GLOBAL_CEILING_WINDOW_HOURS,
    });
    if (error !== null) {
      this.logger.warn(
        `Global ceiling RPC failed for job ${job.id}: ${error.message} — allowing send (fail-open)`,
      );
      return "allowed";
    }
    const row = data[0];
    const sendCount = row?.send_count ?? 0;
    if (sendCount < GLOBAL_CEILING_MAX_SENDS) {
      return "allowed";
    }
    const earliest = row?.earliest_sent_at ?? null;
    if (earliest === null) {
      this.logger.warn(
        `Global ceiling: job ${job.id} has count=${String(sendCount)} but no earliest_sent_at — allowing send (fail-open)`,
      );
      return "allowed";
    }
    const nextAllowedSlot = new Date(
      new Date(earliest).getTime() + GLOBAL_CEILING_WINDOW_MS,
    );
    const delayMs = nextAllowedSlot.getTime() - Date.now();
    if (delayMs <= GLOBAL_CEILING_RESCHEDULE_THRESHOLD_MS) {
      await this.rescheduleForGlobalCeiling(job, nextAllowedSlot);
      return "blocked";
    }
    const skipReason = CELEBRATION_KINDS.has(job.kind)
      ? GLOBAL_CEILING_CELEBRATION_SKIP_REASON
      : GLOBAL_CEILING_SKIP_REASON;
    await this.outbox.markSkipped(job.id, skipReason);
    this.logger.log(
      `Skipped job ${job.id} (kind=${job.kind}) via ${skipReason} — next slot ${nextAllowedSlot.toISOString()} is >${String(GLOBAL_CEILING_RESCHEDULE_THRESHOLD_HOURS)}h away`,
    );
    return "blocked";
  }

  private async rescheduleForGlobalCeiling(
    job: NotificationJobRow,
    nextAllowedSlot: Date,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const restoredAttempts = Math.max(job.attempts - 1, 0);
    const copyReset = this.buildCopyResetOnReschedule(job, nextAllowedSlot);
    const { error } = await supabase
      .from("notification_jobs")
      .update({
        status: "pending",
        claimed_by: null,
        claimed_at: null,
        scheduled_for_utc: nextAllowedSlot.toISOString(),
        attempts: restoredAttempts,
        ...copyReset,
      })
      .eq("id", job.id);
    if (error !== null) {
      this.logger.error(
        `Failed to reschedule job ${job.id} for global ceiling: ${error.message}`,
      );
      return;
    }
    this.logger.log(
      `Rescheduled job ${job.id} (kind=${job.kind}) to ${nextAllowedSlot.toISOString()} due to global ceiling`,
    );
  }

  private async deferForQuietHours(
    job: NotificationJobRow,
    timezone: string,
    quietEnd: number,
  ): Promise<void> {
    const rescheduledFor = nextQuietHoursEnd(new Date(), timezone, quietEnd);
    const supabase = this.supabaseService.getAdminClient();
    const restoredAttempts = Math.max(job.attempts - 1, 0);
    const copyReset = this.buildCopyResetOnReschedule(job, rescheduledFor);
    const { error } = await supabase
      .from("notification_jobs")
      .update({
        status: "pending",
        claimed_by: null,
        claimed_at: null,
        scheduled_for_utc: rescheduledFor.toISOString(),
        attempts: restoredAttempts,
        ...copyReset,
      })
      .eq("id", job.id);
    if (error !== null) {
      this.logger.error(
        `Failed to defer job ${job.id} for quiet hours: ${error.message}`,
      );
      return;
    }
    this.logger.log(
      `Deferred job ${job.id} (kind=${job.kind}) to ${rescheduledFor.toISOString()} due to quiet hours`,
    );
  }

  /**
   * Copy-gen state to apply when a job is rescheduled. If the input-hash
   * would flip under the new `scheduled_for_utc` (15-min slot changed), the
   * previously-generated copy may no longer fit — reset copy_status to
   * `pending` so the next consumer tick regenerates. Stub-only jobs and
   * jobs without a hash (shouldn't happen for eligible kinds, but guard
   * anyway) are left untouched.
   */
  private buildCopyResetOnReschedule(
    job: NotificationJobRow,
    newScheduledForUtc: Date,
  ): Partial<Database["public"]["Tables"]["notification_jobs"]["Update"]> {
    if (job.copy_status === "skipped_stub" || job.copy_input_hash === null) {
      return {};
    }
    const hashInputs = this.buildHashInputsFromJob(job, newScheduledForUtc);
    if (hashInputs === null) {
      return {};
    }
    const newHash = computeCopyInputHash(hashInputs);
    if (newHash === job.copy_input_hash) {
      return {};
    }
    return {
      copy_status: "pending",
      copy_input_hash: newHash,
      copy_generation_id: null,
      copy_claimed_at: null,
      copy_claimed_by: null,
      copy_attempts: 0,
    };
  }

  private buildHashInputsFromJob(
    job: NotificationJobRow,
    newScheduledForUtc: Date,
  ): {
    kind: string;
    language: SupportedLanguage;
    coachId: number | null;
    scheduledForUtc: Date;
    memoryHooks: Record<string, unknown>;
    kindSpecific: Record<string, unknown>;
    suppressStreakCopy: boolean;
  } | null {
    const payload = asRecord(job.payload);
    if (payload === null) {
      return null;
    }
    const copyGenContext = asRecord(payload["copy_gen_context"]);
    if (copyGenContext === null) {
      return null;
    }
    const language = resolveLanguage(
      typeof copyGenContext["language"] === "string"
        ? copyGenContext["language"]
        : null,
    );
    const coachId = extractCoachId(payload["coach"]);
    const memoryHooks = asRecord(payload["memory_hooks"]) ?? {};
    const kindSpecific = asRecord(payload["kind_specific"]) ?? {};
    const shouldSuppressStreak =
      typeof copyGenContext["suppress_streak_copy"] === "boolean"
        ? copyGenContext["suppress_streak_copy"]
        : false;
    return {
      kind: job.kind,
      language,
      coachId,
      scheduledForUtc: newScheduledForUtc,
      memoryHooks,
      kindSpecific,
      suppressStreakCopy: shouldSuppressStreak,
    };
  }

  private async dispatchAndRecord(
    job: NotificationJobRow,
    generation: CopyGenerationRow | null,
  ): Promise<void> {
    const rendered = this.renderPayload(job, generation);
    const reports = await this.notificationsService.sendToUserWithReport(
      job.user_id,
      rendered.title,
      rendered.body,
      rendered.data,
    );

    if (reports.length === 0) {
      await this.outbox.markSkipped(job.id, "no_device_tokens");
      return;
    }
    if (reports.some((report) => report.accepted)) {
      await this.outbox.markSent(job.id);
      await this.deliveryTelemetry.recordDispatchResults(
        job.id,
        reports,
        rendered.sendSource,
      );
      return;
    }
    await this.deliveryTelemetry.recordDispatchResults(
      job.id,
      reports,
      rendered.sendSource,
    );
    const failureReason = reports[0]?.error ?? "apns_rejected";
    await this.recordFailure(job, failureReason);
  }

  private async recordFailure(
    job: NotificationJobRow,
    reason: string,
  ): Promise<void> {
    if (job.attempts >= MAX_ATTEMPTS) {
      await this.outbox.markFailed(job.id, reason);
    } else {
      await this.outbox.revertToPending(job.id, reason);
    }
  }

  private isStale(job: NotificationJobRow): boolean {
    const scheduledAt = new Date(job.scheduled_for_utc).getTime();
    return Date.now() - scheduledAt > STALE_JOB_MAX_AGE_MS;
  }

  private async alreadyAccepted(jobId: string): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: acceptedDelivery, error: deliveryError } = await supabase
      .from("notification_deliveries")
      .select("id")
      .eq("job_id", jobId)
      .eq("apns_response->>accepted", "true")
      .limit(1);
    if (deliveryError !== null) {
      this.logger.error(
        `Failed to check prior deliveries for job ${jobId}: ${deliveryError.message}`,
      );
      return false;
    }
    if (acceptedDelivery.length > 0) {
      return true;
    }
    const { data: job, error: jobError } = await supabase
      .from("notification_jobs")
      .select("sent_at")
      .eq("id", jobId)
      .maybeSingle();
    if (jobError !== null) {
      this.logger.error(
        `Failed to re-read job ${jobId} for accept check: ${jobError.message}`,
      );
      return false;
    }
    return job !== null && job.sent_at !== null;
  }

  private renderPayload(
    job: NotificationJobRow,
    generation: CopyGenerationRow | null,
  ): RenderedPayload {
    const payload = asRecord(job.payload) ?? {};
    const generated = extractGeneratedCopy(generation);
    const title =
      generated !== null ? generated.title : stringField(payload, "title");
    const body =
      generated !== null ? generated.body : stringField(payload, "teaser");
    return {
      title,
      body,
      data: {
        job_id: job.id,
        kind: job.kind,
        cta_deeplink: stringField(payload, "cta_deeplink"),
        why_deeplink: `momentum://notif/why/${job.id}`,
      },
      sendSource: generated !== null ? "generated" : "stub",
    };
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function comparePhaseBCandidates(
  a: NotificationJobRow,
  b: NotificationJobRow,
): number {
  const rankA = PHASE_B_RANK.get(a.kind) ?? Number.POSITIVE_INFINITY;
  const rankB = PHASE_B_RANK.get(b.kind) ?? Number.POSITIVE_INFINITY;
  if (rankA !== rankB) {
    return rankA - rankB;
  }
  const timeA = new Date(a.scheduled_for_utc).getTime();
  const timeB = new Date(b.scheduled_for_utc).getTime();
  if (timeA !== timeB) {
    return timeA - timeB;
  }
  return a.id.localeCompare(b.id);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function stringField(payload: Record<string, unknown>, key: string): string {
  const raw = payload[key];
  return typeof raw === "string" ? raw : "";
}

function extractCoachId(coach: unknown): number | null {
  if (coach === null || typeof coach !== "object" || Array.isArray(coach)) {
    return null;
  }
  const id = (coach as Record<string, unknown>)["id"];
  return typeof id === "number" ? id : null;
}

function extractGeneratedCopy(
  generation: CopyGenerationRow | null,
): { title: string; body: string } | null {
  if (generation === null || generation.status !== "generated") {
    return null;
  }
  const output = generation.output;
  if (output === null || typeof output !== "object" || Array.isArray(output)) {
    return null;
  }
  const rec = output as Record<string, unknown>;
  const title = rec["title"];
  const body = rec["body"];
  if (typeof title !== "string" || typeof body !== "string") {
    return null;
  }
  return { title, body };
}
