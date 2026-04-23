import { Injectable, Logger } from "@nestjs/common";

import { SupabaseService } from "../supabase/supabase.service.js";

@Injectable()
export class NotificationSendsService {
  private readonly logger = new Logger(NotificationSendsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async recordSend(
    userId: string,
    title: string,
    body: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    const { error } = await supabase
      .from("notification_sends")
      .insert({ user_id: userId, title, body });

    if (error !== null) {
      this.logger.error(
        `Failed to record notification send for ${userId}`,
        error.message,
      );
    }
  }
}
