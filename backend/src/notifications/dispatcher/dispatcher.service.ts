import { randomUUID } from "node:crypto";

import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import type { Database } from "../../supabase/database.types.js";
import { SupabaseService } from "../../supabase/supabase.service.js";
import { DeliveryTelemetryService } from "../deliveries/delivery-telemetry.service.js";
import { NotificationsService } from "../notifications.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
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

    try {
      await this.dispatchAndRecord(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.recordFailure(job, message);
    }
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
