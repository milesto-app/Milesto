// M2.9.4 — fleet-wide copy-gen SLO monitor.
//
// Runs hourly. Each tick queries `v_copy_gen_slo_24h` (defined in
// 20260422_notif_11_copy_gen.sql) for the rolling 24 h AI-generated share.
// If the share drops below 0.75 for two consecutive 1 h windows we insert a
// row into `notification_system_alerts` with `kind='copy_gen_slo_breach'`
// and reset the run so the next alert only fires after a fresh two-window
// streak below threshold — prevents hourly alert spam during a sustained
// outage.
//
// Windows with zero deliveries are treated as "no signal", which leaves the
// breach streak untouched. This matters during early rollout (week 1
// bucket-0 is small) and for brief scheduler outages where there's nothing
// to measure.

import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

import type { Json } from "../../supabase/database.types.js";
import { SupabaseService } from "../../supabase/supabase.service.js";

const CRON_HOURLY = "0 0 * * * *";
const SLO_THRESHOLD = 0.75;
const CONSECUTIVE_WINDOWS_TO_ALERT = 2;
const SHARE_LOG_FRACTION_DIGITS = 3;
const ALERT_KIND_SLO_BREACH = "copy_gen_slo_breach";

interface SloSnapshot {
  readonly total: number;
  readonly aiGenerated: number;
  readonly aiShare: number;
}

@Injectable()
export class CopyGenSloAlertService {
  private readonly logger = new Logger(CopyGenSloAlertService.name);
  private consecutiveBreaches = 0;

  constructor(private readonly supabaseService: SupabaseService) {}

  @Cron(CRON_HOURLY)
  public async tick(): Promise<void> {
    try {
      const snapshot = await this.fetchSnapshot();
      if (snapshot === null) {
        return;
      }
      if (snapshot.total === 0) {
        this.logger.debug("SLO tick skipped: no deliveries in rolling 24h");
        return;
      }
      if (snapshot.aiShare >= SLO_THRESHOLD) {
        if (this.consecutiveBreaches > 0) {
          this.logger.log(
            `SLO recovered (ai_share=${snapshot.aiShare.toFixed(SHARE_LOG_FRACTION_DIGITS)}, total=${String(snapshot.total)}); clearing breach streak`,
          );
        }
        this.consecutiveBreaches = 0;
        return;
      }
      this.consecutiveBreaches += 1;
      this.logger.warn(
        `SLO breach window ${String(this.consecutiveBreaches)}: ai_share=${snapshot.aiShare.toFixed(SHARE_LOG_FRACTION_DIGITS)} < ${String(SLO_THRESHOLD)} (total=${String(snapshot.total)}, ai=${String(snapshot.aiGenerated)})`,
      );
      if (this.consecutiveBreaches >= CONSECUTIVE_WINDOWS_TO_ALERT) {
        await this.raiseAlert(snapshot);
        this.consecutiveBreaches = 0;
      }
    } catch (error) {
      this.logger.error(
        "SLO alert tick failed",
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async fetchSnapshot(): Promise<SloSnapshot | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("v_copy_gen_slo_24h")
      .select("total, ai_generated, ai_share")
      .limit(1)
      .maybeSingle();
    if (error !== null) {
      this.logger.error(`Failed to read v_copy_gen_slo_24h: ${error.message}`);
      return null;
    }
    if (data === null) {
      return { total: 0, aiGenerated: 0, aiShare: 0 };
    }
    return {
      total: data.total ?? 0,
      aiGenerated: data.ai_generated ?? 0,
      aiShare: data.ai_share ?? 0,
    };
  }

  private async raiseAlert(snapshot: SloSnapshot): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const payload: Json = {
      ai_share: snapshot.aiShare,
      ai_generated: snapshot.aiGenerated,
      total: snapshot.total,
      threshold: SLO_THRESHOLD,
      consecutive_windows: CONSECUTIVE_WINDOWS_TO_ALERT,
    };
    const { error } = await supabase
      .from("notification_system_alerts")
      .insert({ kind: ALERT_KIND_SLO_BREACH, payload });
    if (error !== null) {
      this.logger.error(
        `Failed to insert copy_gen_slo_breach alert (ai_share=${snapshot.aiShare.toFixed(SHARE_LOG_FRACTION_DIGITS)}): ${error.message}`,
      );
      return;
    }
    this.logger.error(
      `copy_gen_slo_breach alert raised: ai_share=${snapshot.aiShare.toFixed(SHARE_LOG_FRACTION_DIGITS)} under threshold ${String(SLO_THRESHOLD)} for ${String(CONSECUTIVE_WINDOWS_TO_ALERT)} consecutive 1h windows`,
    );
  }
}
