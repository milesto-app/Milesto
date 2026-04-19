import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";

import type { Json } from "../../supabase/database.types.js";
import { SupabaseService } from "../../supabase/supabase.service.js";
import type { OutboxJobInput } from "./outbox.types.js";

export type OutboxInsertResult =
  | { status: "inserted"; jobId: string }
  | { status: "duplicate" };

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async insert(input: OutboxJobInput): Promise<OutboxInsertResult> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("notification_jobs")
      .insert({
        user_id: input.userId,
        kind: input.kind,
        tier: input.tier,
        dedup_key: input.dedupKey,
        scheduled_for_utc: input.scheduledForUtc.toISOString(),
        local_date: input.localDate ?? null,
        payload: input.payload as Json,
        sequence_id: input.sequenceId ?? null,
        sequence_step: input.sequenceStep ?? null,
        experiment_id: input.experimentId ?? null,
        variant: input.variant ?? null,
      })
      .select("id")
      .single();

    if (error !== null) {
      if (this.isDuplicateDedupKey(error.message)) {
        return { status: "duplicate" };
      }
      this.logger.error(
        `Failed to insert notification job ${input.dedupKey}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        `Failed to enqueue notification: ${error.message}`,
      );
    }

    return { status: "inserted", jobId: data.id };
  }

  public async markSent(id: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("notification_jobs")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id);
    this.logIfFailed(id, "markSent", error);
  }

  public async markSkipped(id: string, reason: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("notification_jobs")
      .update({ status: "skipped", skip_reason: reason })
      .eq("id", id);
    this.logIfFailed(id, "markSkipped", error);
  }

  public async revertToPending(id: string, lastError: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("notification_jobs")
      .update({ status: "pending", last_error: lastError, claimed_by: null })
      .eq("id", id);
    this.logIfFailed(id, "revertToPending", error);
  }

  public async markFailed(id: string, lastError: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("notification_jobs")
      .update({ status: "failed", last_error: lastError })
      .eq("id", id);
    this.logIfFailed(id, "markFailed", error);
  }

  private logIfFailed(
    jobId: string,
    op: string,
    error: { message: string } | null,
  ): void {
    if (error !== null) {
      this.logger.error(
        `Outbox ${op} failed for job ${jobId}: ${error.message}. Orphan recovery may re-process.`,
      );
    }
  }

  private isDuplicateDedupKey(message: string): boolean {
    return message.includes("notification_jobs_dedup_unique");
  }
}
