import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";

import { SupabaseService } from "../../supabase/supabase.service.js";

export const ACTIVITY_KINDS = [
  "foreground",
  "task_completed",
  "message_sent",
  "debrief_submitted",
  "notification_interaction",
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async record(
    userId: string,
    kind: ActivityKind,
    occurredAt?: Date,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const occurredIso = (occurredAt ?? new Date()).toISOString();

    const { error } = await supabase.rpc("record_user_activity", {
      p_user_id: userId,
      p_kind: kind,
      p_occurred_at: occurredIso,
    });

    if (error !== null) {
      this.logger.error(
        `Failed to record activity ${kind} for user ${userId}`,
        error.message,
      );
      throw new InternalServerErrorException(
        `Failed to record activity: ${error.message}`,
      );
    }
  }
}
