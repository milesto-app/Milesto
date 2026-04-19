import { Injectable, Logger } from "@nestjs/common";

import {
  SUPABASE_NOT_FOUND,
  SUPABASE_UNIQUE_VIOLATION,
} from "../supabase/error-codes.js";
import { SupabaseService } from "../supabase/supabase.service.js";

@Injectable()
export class ProcessedNotificationsService {
  private readonly logger = new Logger(ProcessedNotificationsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async isProcessed(notificationUuid: string): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("processed_notifications")
      .select("notification_uuid")
      .eq("notification_uuid", notificationUuid)
      .maybeSingle();

    if (error && error.code !== SUPABASE_NOT_FOUND) {
      this.logger.error(
        `Failed to check notification uuid=${notificationUuid}: ${error.message}`,
      );
      throw error;
    }

    return data !== null;
  }

  public async markProcessed(
    notificationUuid: string,
    notificationType: string,
    subtype: string | null,
  ): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase.from("processed_notifications").insert({
      notification_uuid: notificationUuid,
      notification_type: notificationType,
      subtype,
    });

    if (!error) {
      return true;
    }

    if (error.code === SUPABASE_UNIQUE_VIOLATION) {
      this.logger.debug(
        `Duplicate notification uuid=${notificationUuid} type=${notificationType}`,
      );
      return false;
    }

    this.logger.error(
      `Failed to mark notification processed uuid=${notificationUuid}: ${error.message}`,
    );
    throw error;
  }
}
