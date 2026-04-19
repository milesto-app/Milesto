import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

import { SupabaseService } from "../../supabase/supabase.service.js";

const ORPHAN_THRESHOLD_MINUTES = 5;
const MS_PER_MINUTE = 60_000;
const ORPHAN_THRESHOLD_MS = ORPHAN_THRESHOLD_MINUTES * MS_PER_MINUTE;

@Injectable()
export class OrphanRecoveryService {
  private readonly logger = new Logger(OrphanRecoveryService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  @Cron("0 */2 * * * *")
  public async recover(): Promise<void> {
    const threshold = new Date(Date.now() - ORPHAN_THRESHOLD_MS).toISOString();
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("notification_jobs")
      .update({ status: "pending", claimed_by: null })
      .eq("status", "claimed")
      .lt("claimed_at", threshold)
      .select("id");

    if (error !== null) {
      this.logger.error(`Orphan recovery failed: ${error.message}`);
      return;
    }
    if (data.length > 0) {
      this.logger.warn(
        `Recovered ${String(data.length)} orphan notification jobs`,
      );
    }
  }
}
