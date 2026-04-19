import { randomUUID } from "node:crypto";

import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import type { Database } from "../../supabase/database.types.js";
import { SupabaseService } from "../../supabase/supabase.service.js";
import { DeliveryTelemetryService } from "../deliveries/delivery-telemetry.service.js";
import { GateService } from "../gate/gate.service.js";
import { NotificationsService } from "../notifications.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import type { NotificationKind } from "../outbox/outbox.types.js";
import { nextQuietHoursEnd } from "../producers/local-time.js";
import { recheckPredicate } from "./predicates.js";

type NotificationJobRow =
  Database["public"]["Tables"]["notification_jobs"]["Row"];

interface RenderedPayload {
  title: string;
  body: string;
  data: Record<string, string>;
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
      const jobs = await this.claim();
      if (jobs.length === 0) {
        return;
      }
      this.logger.log(
        `Claimed ${String(jobs.length)} notification jobs (worker=${this.workerId})`,
      );
      await Promise.all(jobs.map(async (job) => this.dispatch(job)));
    } catch (error) {
      this.logger.error(
        "Dispatcher drain failed",
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.inFlight = false;
    }
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

  private async dispatch(job: NotificationJobRow): Promise<void> {
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
      await this.dispatchAndRecord(job);
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
    await this.outbox.markSkipped(job.id, GLOBAL_CEILING_SKIP_REASON);
    this.logger.log(
      `Skipped job ${job.id} (kind=${job.kind}) via global_ceiling — next slot ${nextAllowedSlot.toISOString()} is >${String(GLOBAL_CEILING_RESCHEDULE_THRESHOLD_HOURS)}h away`,
    );
    return "blocked";
  }

  private async rescheduleForGlobalCeiling(
    job: NotificationJobRow,
    nextAllowedSlot: Date,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const restoredAttempts = Math.max(job.attempts - 1, 0);
    const { error } = await supabase
      .from("notification_jobs")
      .update({
        status: "pending",
        claimed_by: null,
        claimed_at: null,
        scheduled_for_utc: nextAllowedSlot.toISOString(),
        attempts: restoredAttempts,
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
    const { error } = await supabase
      .from("notification_jobs")
      .update({
        status: "pending",
        claimed_by: null,
        claimed_at: null,
        scheduled_for_utc: rescheduledFor.toISOString(),
        attempts: restoredAttempts,
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

  private async dispatchAndRecord(job: NotificationJobRow): Promise<void> {
    const rendered = this.renderPayload(job);
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
      await this.deliveryTelemetry.recordDispatchResults(job.id, reports);
      return;
    }
    await this.deliveryTelemetry.recordDispatchResults(job.id, reports);
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

  private renderPayload(job: NotificationJobRow): RenderedPayload {
    const payload =
      typeof job.payload === "object" && job.payload !== null
        ? (job.payload as Record<string, unknown>)
        : {};
    const title = typeof payload["title"] === "string" ? payload["title"] : "";
    const teaser =
      typeof payload["teaser"] === "string" ? payload["teaser"] : "";
    return {
      title,
      body: teaser,
      data: {
        job_id: job.id,
        kind: job.kind,
        cta_deeplink:
          typeof payload["cta_deeplink"] === "string"
            ? payload["cta_deeplink"]
            : "",
        why_deeplink: `momentum://notif/why/${job.id}`,
      },
    };
  }
}
