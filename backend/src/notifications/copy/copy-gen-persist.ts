// M2.9.3 — shared persistence for copy-gen results.
//
// Both the pre-dispatch consumer (`CopyGenConsumerService`) and the
// short-fuse `PostCommitCopyGenRunner` produce a `CopyGenResult` that needs
// the same two follow-up writes:
//
//   1. INSERT a row into `notification_copy_generations` (the ledger).
//   2. UPDATE `notification_jobs` to stamp `copy_status` + `copy_generation_id`.
//
// Centralising the writes here keeps the two code paths in lock-step — so
// dispatcher-side rendering (which only looks at `copy_generation_id` +
// `notification_copy_generations.status`) behaves identically regardless of
// which path generated the copy.

import type { Logger } from "@nestjs/common";

import type { Json } from "../../supabase/database.types.js";
import type { SupabaseService } from "../../supabase/supabase.service.js";
import type { CopyGenJobContext, CopyGenResult } from "./copy-gen.service.js";

export async function persistCopyGenResult(args: {
  supabaseService: SupabaseService;
  logger: Logger;
  ctx: CopyGenJobContext;
  result: CopyGenResult;
}): Promise<void> {
  const { supabaseService, logger, ctx, result } = args;
  const supabase = supabaseService.getAdminClient();
  const { data, error } = await supabase
    .from("notification_copy_generations")
    .insert({
      job_id: ctx.jobId,
      kind: ctx.kind,
      language: ctx.language,
      coach_id: ctx.coachId,
      prompt_version: result.promptVersion,
      model: result.model,
      status: result.status,
      error_code: result.errorCode ?? null,
      provider_status: result.providerStatus,
      latency_ms: result.latencyMs,
      output:
        result.output === undefined ? null : (result.output as unknown as Json),
      input_hash: ctx.inputHash,
      attempt_no: ctx.attemptNo,
    })
    .select("id")
    .single();
  if (error !== null) {
    logger.error(
      `Failed to persist copy generation row for job ${ctx.jobId}: ${error.message}`,
    );
    return;
  }
  const { error: updateError } = await supabase
    .from("notification_jobs")
    .update({
      copy_status: result.status === "generated" ? "generated" : "failed",
      copy_generation_id: data.id,
    })
    .eq("id", ctx.jobId);
  if (updateError !== null) {
    logger.error(
      `Failed to stamp copy_status on job ${ctx.jobId}: ${updateError.message}`,
    );
  }
}
