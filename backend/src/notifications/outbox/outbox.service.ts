import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";

import type { Json, TablesInsert } from "../../supabase/database.types.js";
import { SupabaseService } from "../../supabase/supabase.service.js";
import {
  COPY_GEN_STATUS,
  type CopyGenInsertMetadata,
  resolveCopyGenInsertMetadata,
} from "../copy/copy-gen-eligibility.js";
import type { OutboxJobInput } from "./outbox.types.js";

export type OutboxInsertResult =
  | {
      status: "inserted";
      jobId: string;
      /**
       * Present when the inserted row is eligible for copy-gen. Producers for
       * short-fuse kinds read `policy` to decide whether to kick off an
       * immediate post-commit generation.
       */
      copyGen?: CopyGenInsertMetadata;
    }
  | { status: "duplicate" };

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async insert(input: OutboxJobInput): Promise<OutboxInsertResult> {
    const supabase = this.supabaseService.getAdminClient();
    const copyGen = this.resolveCopyGenColumns(input);
    const row = buildInsertRow(input, copyGen.metadata);
    const { data, error } = await supabase
      .from("notification_jobs")
      .insert(row)
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

    return { status: "inserted", jobId: data.id, copyGen: copyGen.metadata };
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

  private resolveCopyGenColumns(input: OutboxJobInput): {
    metadata: CopyGenInsertMetadata;
  } {
    if (input.copyGen === undefined) {
      // Producers that don't emit a `copyGen` block explicitly opt this job
      // out of the pre-dispatch consumer. The dispatcher renders the stub.
      return {
        metadata: {
          copyStatus: COPY_GEN_STATUS.SKIPPED_STUB,
          copyInputHash: null,
          copyClaimedBy: null,
          copyClaimedAt: null,
          copyAttempts: 0,
          policy: "skip_stub",
        },
      };
    }
    const metadata = resolveCopyGenInsertMetadata({
      userId: input.userId,
      kind: input.kind,
      language: input.copyGen.language,
      coachId: input.copyGen.coachId,
      scheduledForUtc: input.scheduledForUtc,
      memoryHooks: input.copyGen.memoryHooks,
      kindSpecific: input.copyGen.kindSpecific,
      suppressStreakCopy: input.copyGen.suppressStreakCopy,
      ...(input.copyGen.producerName !== undefined
        ? { producerName: input.copyGen.producerName }
        : {}),
    });
    return { metadata };
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

// Stamp the copy-gen context into payload so the pre-dispatch consumer can
// rebuild CopyGenJobContext from the claimed row alone — `language` and
// `suppress_streak_copy` aren't otherwise present in the job.
function buildInsertRow(
  input: OutboxJobInput,
  copyGen: CopyGenInsertMetadata,
): TablesInsert<"notification_jobs"> {
  const payload: Record<string, unknown> =
    input.copyGen === undefined
      ? input.payload
      : {
          ...input.payload,
          copy_gen_context: {
            language: input.copyGen.language,
            suppress_streak_copy: input.copyGen.suppressStreakCopy,
          },
        };
  return {
    user_id: input.userId,
    kind: input.kind,
    tier: input.tier,
    dedup_key: input.dedupKey,
    scheduled_for_utc: input.scheduledForUtc.toISOString(),
    local_date: input.localDate ?? null,
    payload: payload as Json,
    sequence_id: input.sequenceId ?? null,
    sequence_step: input.sequenceStep ?? null,
    experiment_id: input.experimentId ?? null,
    variant: input.variant ?? null,
    copy_status: copyGen.copyStatus,
    copy_input_hash: copyGen.copyInputHash,
    copy_claimed_by: copyGen.copyClaimedBy,
    copy_claimed_at: copyGen.copyClaimedAt?.toISOString() ?? null,
    copy_attempts: copyGen.copyAttempts,
  };
}
