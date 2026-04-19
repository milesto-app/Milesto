import { Injectable, Logger } from "@nestjs/common";

import type { Json } from "../../supabase/database.types.js";
import { SupabaseService } from "../../supabase/supabase.service.js";
import type { DeliveryReport } from "../notifications.service.js";

@Injectable()
export class DeliveryTelemetryService {
  private readonly logger = new Logger(DeliveryTelemetryService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async recordDispatchResults(
    jobId: string,
    reports: DeliveryReport[],
    sendSource: "stub" | "generated" = "stub",
  ): Promise<void> {
    if (reports.length === 0) {
      return;
    }
    const supabase = this.supabaseService.getAdminClient();
    const nowIso = new Date().toISOString();
    const rows = reports.map((report) => ({
      job_id: jobId,
      device_token: report.token,
      sent_at: nowIso,
      apns_response: this.buildApnsResponse(report),
      send_source: sendSource,
    }));
    const { error } = await supabase
      .from("notification_deliveries")
      .upsert(rows, { onConflict: "job_id,device_token" });
    if (error !== null) {
      this.logger.error(
        `Failed to record delivery results for job ${jobId}: ${error.message}`,
      );
    }
  }

  private buildApnsResponse(report: DeliveryReport): Json {
    const response: Record<string, Json> = { accepted: report.accepted };
    if (report.statusCode !== undefined) {
      response["status_code"] = report.statusCode;
    }
    if (report.body !== undefined && report.body.length > 0) {
      response["body"] = report.body;
    }
    if (report.error !== undefined) {
      response["error"] = report.error;
    }
    return response as Json;
  }

  public async markReceived(
    userId: string,
    jobId: string,
    deviceToken: string,
  ): Promise<void> {
    if (!(await this.ownsJob(userId, jobId))) {
      return;
    }
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("notification_deliveries")
      .update({ received_at: new Date().toISOString() })
      .eq("job_id", jobId)
      .eq("device_token", deviceToken)
      .is("received_at", null);

    if (error !== null) {
      this.logger.error(
        `Failed to update received_at for job ${jobId}`,
        error.message,
      );
    }
  }

  public async markOpened(
    userId: string,
    jobId: string,
    deviceToken: string,
  ): Promise<void> {
    if (!(await this.ownsJob(userId, jobId))) {
      return;
    }
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("notification_deliveries")
      .update({ opened_at: new Date().toISOString() })
      .eq("job_id", jobId)
      .eq("device_token", deviceToken)
      .is("opened_at", null);

    if (error !== null) {
      this.logger.error(
        `Failed to update opened_at for job ${jobId}`,
        error.message,
      );
    }
  }

  private async ownsJob(userId: string, jobId: string): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("notification_jobs")
      .select("user_id")
      .eq("id", jobId)
      .maybeSingle();

    if (error !== null) {
      this.logger.error(
        `Failed to load notification job ${jobId}`,
        error.message,
      );
      return false;
    }
    return data !== null && data.user_id === userId;
  }
}
