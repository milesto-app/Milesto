// M2.9.3 — Orphan recovery for `copy_status='generating'` leases.
//
// A job enters `generating` when either the pre-dispatch consumer claims it
// via `claim_notification_copy`, or a short-fuse producer stamps the row at
// outbox insert. In either case, if the worker dies mid-generation the row
// stays parked with a stale lease. This service releases it back to
// `pending` so the next consumer tick can re-claim.
//
// Terminal stop: once `copy_attempts >= consumerMaxAttempts`, we flip the
// row to `copy_status='failed'` and leave the lease cleared. The dispatcher
// falls back to the stub. This mirrors the dispatcher's own orphan-recovery
// service on `status='claimed'` (5 min window vs our 2 min).

import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

import { config } from "../../config/app.config.js";
import { SupabaseService } from "../../supabase/supabase.service.js";

const CRON_EVERY_2_MIN = "0 */2 * * * *";
const MS_PER_MINUTE = 60_000;

@Injectable()
export class CopyGenOrphanRecoveryService {
  private readonly logger = new Logger(CopyGenOrphanRecoveryService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  @Cron(CRON_EVERY_2_MIN)
  public async recover(): Promise<void> {
    const threshold = new Date(
      Date.now() - config.copyGen.orphanLeaseTimeoutMs,
    ).toISOString();
    await Promise.all([this.resetRetryable(threshold), this.failExhausted()]);
  }

  private async resetRetryable(thresholdIso: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("notification_jobs")
      .update({
        copy_status: "pending",
        copy_claimed_at: null,
        copy_claimed_by: null,
      })
      .eq("copy_status", "generating")
      .lt("copy_claimed_at", thresholdIso)
      .lt("copy_attempts", config.copyGen.consumerMaxAttempts)
      .select("id");
    if (error !== null) {
      this.logger.error(`Copy-gen orphan reset failed: ${error.message}`);
      return;
    }
    if (data.length > 0) {
      const minutes = config.copyGen.orphanLeaseTimeoutMs / MS_PER_MINUTE;
      this.logger.warn(
        `Reset ${String(data.length)} orphan copy-gen claims (stale >${String(minutes)} min)`,
      );
    }
  }

  private async failExhausted(): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("notification_jobs")
      .update({
        copy_status: "failed",
        copy_claimed_at: null,
        copy_claimed_by: null,
      })
      .eq("copy_status", "generating")
      .gte("copy_attempts", config.copyGen.consumerMaxAttempts)
      .select("id");
    if (error !== null) {
      this.logger.error(
        `Copy-gen exhausted-attempts flip failed: ${error.message}`,
      );
      return;
    }
    if (data.length > 0) {
      this.logger.warn(
        `Flipped ${String(data.length)} copy-gen jobs to failed (attempts >= max)`,
      );
    }
  }
}
