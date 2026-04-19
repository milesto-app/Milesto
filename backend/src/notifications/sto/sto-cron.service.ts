import { Injectable, Logger } from "@nestjs/common";

import { SupabaseService } from "../../supabase/supabase.service.js";
import { toLocalMoment } from "../producers/local-time.js";
import { StoService } from "./sto.service.js";

const STO_TRIGGER_HOUR = 2;
const STO_TRIGGER_MINUTE_MAX = 14;

interface StoCandidate {
  user_id: string;
  timezone: string | null;
}

@Injectable()
export class StoCronService {
  private readonly logger = new Logger(StoCronService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly stoService: StoService,
  ) {}

  public async tickForLocalTime(nowUtc: Date): Promise<void> {
    const candidates = await this.fetchCandidates();
    if (candidates.length === 0) {
      return;
    }
    let processed = 0;
    for (const candidate of candidates) {
      if (!this.isInTriggerWindow(candidate.timezone, nowUtc)) {
        continue;
      }
      try {
        await this.stoService.computeActiveHour(candidate.user_id);
        processed += 1;
      } catch (error) {
        this.logger.error(
          `STO computation failed for user ${candidate.user_id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
    if (processed > 0) {
      this.logger.log(
        `STO cron processed ${String(processed)} users at ${nowUtc.toISOString()}`,
      );
    }
  }

  private isInTriggerWindow(timezone: string | null, nowUtc: Date): boolean {
    if (timezone === null) {
      return false;
    }
    const local = toLocalMoment(nowUtc, timezone);
    return (
      local.hour === STO_TRIGGER_HOUR && local.minute <= STO_TRIGGER_MINUTE_MAX
    );
  }

  private async fetchCandidates(): Promise<StoCandidate[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, timezone")
      .eq("notif_enabled", true)
      .not("timezone", "is", null);
    if (error !== null) {
      this.logger.error(`STO candidate fetch failed: ${error.message}`);
      return [];
    }
    return data.map((row) => ({
      user_id: row.id,
      timezone: row.timezone,
    }));
  }
}
