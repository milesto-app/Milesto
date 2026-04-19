// M2.9.3 — shared persistence for copy-gen results.
// M2.9.4 — also owns the structured per-attempt observability log.
//
// Both the pre-dispatch consumer (`CopyGenConsumerService`) and the
// short-fuse `PostCommitCopyGenRunner` produce a `CopyGenResult` that needs
// the same two follow-up writes:
//
//   1. INSERT a row into `notification_copy_generations` (the ledger).
//   2. UPDATE `notification_jobs` to stamp `copy_status` + `copy_generation_id`.
//
// After both writes we emit one structured log line per attempt
// (`copy_gen.attempt`). Supabase Logs indexes stdout JSON, so this line
// becomes the ad-hoc query surface until the M3.6 admin tile lands.

import type { Logger } from "@nestjs/common";

import type { Json } from "../../supabase/database.types.js";
import type { SupabaseService } from "../../supabase/supabase.service.js";
import type { CopyGenJobContext, CopyGenResult } from "./copy-gen.service.js";

export const COPY_GEN_LOG_EVENT = "copy_gen.attempt";

export interface CopyGenAttemptLog {
  readonly event: typeof COPY_GEN_LOG_EVENT;
  readonly job_id: string;
  readonly kind: string;
  readonly coach_id: number | null;
  readonly language: string;
  readonly status: "generated" | "failed";
  readonly error_code: string | null;
  readonly attempt_no: number;
  readonly latency_ms: number;
  readonly prompt_version: string;
  readonly provider_status: number | null;
  readonly input_hash: string;
  readonly model: string;
}

export function logCopyGenAttempt(
  logger: Logger,
  entry: CopyGenAttemptLog,
): void {
  const message = JSON.stringify(entry);
  if (entry.status === "failed") {
    logger.warn(message);
    return;
  }
  logger.log(message);
}

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
  logCopyGenAttempt(logger, {
    event: COPY_GEN_LOG_EVENT,
    job_id: ctx.jobId,
    kind: ctx.kind,
    coach_id: ctx.coachId,
    language: ctx.language,
    status: result.status,
    error_code: result.errorCode ?? null,
    attempt_no: ctx.attemptNo,
    latency_ms: result.latencyMs,
    prompt_version: result.promptVersion,
    provider_status: result.providerStatus,
    input_hash: ctx.inputHash,
    model: result.model,
  });
}
