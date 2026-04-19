// M2.9.3 — Pre-dispatch copy-gen consumer.
//
// Runs every 30 s (with a tiny random jitter so multiple replicas don't align
// their claim windows). Each tick:
//
//   1. Bail early if COPY_GEN_GLOBAL_ENABLED=false.
//   2. Claim up to `consumerBatchSize` jobs via `claim_notification_copy` —
//      a `FOR UPDATE SKIP LOCKED` RPC over jobs in the next
//      `consumerLookaheadMinutes` window.
//   3. For each claim, build CopyGenJobContext and call CopyGenService in
//      parallel with a concurrency cap of `consumerConcurrency`.
//   4. Persist the result: one row in `notification_copy_generations` per
//      attempt (success or failure), and an update to the job stamping
//      `copy_status` + `copy_generation_id`.
//   5. Check backlog and insert a `notification_system_alerts` row if the
//      due-soon pending queue exceeds the threshold.
//
// The LLM call NEVER happens inside a DB transaction; the generation row is
// inserted after the LLM returns. If this process dies mid-generation the
// row stays in `copy_status='generating'` until the orphan-recovery service
// releases it (default 2 min).

import { randomUUID } from "node:crypto";

import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

import { config } from "../../config/app.config.js";
import type { Database, Json } from "../../supabase/database.types.js";
import { SupabaseService } from "../../supabase/supabase.service.js";
import type { CopyGenJobContext } from "./copy-gen.service.js";
import { CopyGenService } from "./copy-gen.service.js";
import {
  COPY_GEN_LOG_EVENT,
  logCopyGenAttempt,
  persistCopyGenResult,
} from "./copy-gen-persist.js";
import { resolveLanguage, type SupportedLanguage } from "./fallbacks.js";

type NotificationJobRow =
  Database["public"]["Tables"]["notification_jobs"]["Row"];

const CRON_EVERY_30_SECONDS = "*/30 * * * * *";
const MAX_JITTER_MS = 5_000;
const ALERT_KIND_BACKLOG = "copy_gen_backlog";
const BACKLOG_HORIZON_MINUTES = 2;
const MS_PER_MINUTE = 60_000;

interface ClaimContext {
  readonly job: NotificationJobRow;
  readonly ctx: CopyGenJobContext;
}

@Injectable()
export class CopyGenConsumerService {
  private readonly logger = new Logger(CopyGenConsumerService.name);
  private readonly workerId = `copy-gen-consumer-${randomUUID()}`;
  private inFlight = false;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly copyGenService: CopyGenService,
  ) {}

  @Cron(CRON_EVERY_30_SECONDS)
  public async drain(): Promise<void> {
    if (this.inFlight) {
      return;
    }
    this.inFlight = true;
    try {
      await sleep(Math.floor(Math.random() * MAX_JITTER_MS));
      if (!config.copyGen.globalEnabled) {
        return;
      }
      const claimed = await this.claim();
      if (claimed.length === 0) {
        await this.checkBacklog();
        return;
      }
      this.logger.log(
        `Claimed ${String(claimed.length)} copy-gen jobs (worker=${this.workerId})`,
      );
      const contexts = this.buildContexts(claimed);
      await runWithConcurrency(
        contexts,
        config.copyGen.consumerConcurrency,
        async (entry) => this.generateAndPersist(entry),
      );
      await this.checkBacklog();
    } catch (error) {
      this.logger.error(
        "Copy-gen consumer drain failed",
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.inFlight = false;
    }
  }

  private async claim(): Promise<NotificationJobRow[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase.rpc("claim_notification_copy", {
      p_worker_id: this.workerId,
      p_batch_size: config.copyGen.consumerBatchSize,
      p_lookahead_minutes: config.copyGen.consumerLookaheadMinutes,
      p_max_attempts: config.copyGen.consumerMaxAttempts,
    });
    if (error !== null) {
      this.logger.error(`Failed to claim copy-gen jobs: ${error.message}`);
      return [];
    }
    return data;
  }

  private buildContexts(rows: NotificationJobRow[]): ClaimContext[] {
    const contexts: ClaimContext[] = [];
    for (const row of rows) {
      const ctx = this.buildContext(row);
      if (ctx === null) {
        void this.markFailed(row, "parse_error", {
          message: "payload missing copy-gen context",
        });
        continue;
      }
      contexts.push({ job: row, ctx });
    }
    return contexts;
  }

  private buildContext(row: NotificationJobRow): CopyGenJobContext | null {
    const payload = asRecord(row.payload);
    if (payload === null) {
      return null;
    }
    const copyGenContext = asRecord(payload["copy_gen_context"]);
    const stub = buildStubFromPayload(payload);
    if (copyGenContext === null || stub === null) {
      return null;
    }
    const language = resolveLanguageFromContext(copyGenContext["language"]);
    const coachId = extractCoachId(payload["coach"]);
    const memoryHooks = asRecord(payload["memory_hooks"]) ?? {};
    const kindSpecific = asRecord(payload["kind_specific"]) ?? {};
    const shouldSuppressStreak =
      typeof copyGenContext["suppress_streak_copy"] === "boolean"
        ? copyGenContext["suppress_streak_copy"]
        : false;
    if (row.copy_input_hash === null) {
      return null;
    }
    return {
      jobId: row.id,
      kind: row.kind,
      language,
      coachId,
      stub,
      memoryHooks,
      kindSpecific,
      suppressStreakCopy: shouldSuppressStreak,
      inputHash: row.copy_input_hash,
      attemptNo: row.copy_attempts,
    };
  }

  private async generateAndPersist(entry: ClaimContext): Promise<void> {
    try {
      const result = await this.copyGenService.generate(entry.ctx);
      await persistCopyGenResult({
        supabaseService: this.supabaseService,
        logger: this.logger,
        ctx: entry.ctx,
        result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Copy-gen generation threw for job ${entry.job.id}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.markFailed(entry.job, "provider_error", { message });
    }
  }

  private async markFailed(
    job: NotificationJobRow,
    errorCode: string,
    meta: { message: string },
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    // Stamp a synthetic failed generation row so every job lifecycle event is
    // auditable — the dispatcher falls back to the stub regardless.
    const { data, error } = await supabase
      .from("notification_copy_generations")
      .insert({
        job_id: job.id,
        kind: job.kind,
        language: "en",
        coach_id: null,
        prompt_version: "n/a",
        model: "n/a",
        status: "failed",
        error_code: errorCode,
        provider_status: null,
        latency_ms: 0,
        output: null,
        input_hash: job.copy_input_hash ?? "n/a",
        attempt_no: job.copy_attempts,
      })
      .select("id")
      .single();
    if (error !== null) {
      this.logger.error(
        `Failed to record synthetic failure for job ${job.id} (${errorCode}, ${meta.message}): ${error.message}`,
      );
      return;
    }
    const { error: updateError } = await supabase
      .from("notification_jobs")
      .update({ copy_status: "failed", copy_generation_id: data.id })
      .eq("id", job.id);
    if (updateError !== null) {
      this.logger.error(
        `Failed to mark job ${job.id} copy_status='failed': ${updateError.message}`,
      );
    }
    logCopyGenAttempt(this.logger, {
      event: COPY_GEN_LOG_EVENT,
      job_id: job.id,
      kind: job.kind,
      coach_id: null,
      language: "en",
      status: "failed",
      error_code: errorCode,
      attempt_no: job.copy_attempts,
      latency_ms: 0,
      prompt_version: "n/a",
      provider_status: null,
      input_hash: job.copy_input_hash ?? "n/a",
      model: "n/a",
    });
  }

  private async checkBacklog(): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const horizon = new Date(
      Date.now() + BACKLOG_HORIZON_MINUTES * MS_PER_MINUTE,
    ).toISOString();
    const { count, error } = await supabase
      .from("notification_jobs")
      .select("id", { count: "exact", head: true })
      .eq("copy_status", "pending")
      .lt("scheduled_for_utc", horizon);
    if (error !== null) {
      this.logger.warn(`Backlog check failed: ${error.message}`);
      return;
    }
    const pending = count ?? 0;
    if (pending <= config.copyGen.consumerBacklogAlertThreshold) {
      return;
    }
    const { error: alertError } = await supabase
      .from("notification_system_alerts")
      .insert({
        kind: ALERT_KIND_BACKLOG,
        payload: {
          pending_count: pending,
          threshold: config.copyGen.consumerBacklogAlertThreshold,
          horizon_minutes: BACKLOG_HORIZON_MINUTES,
        } as Json,
      });
    if (alertError !== null) {
      this.logger.warn(
        `Failed to insert copy_gen_backlog alert (pending=${String(pending)}): ${alertError.message}`,
      );
      return;
    }
    this.logger.warn(
      `copy_gen_backlog alert raised: pending=${String(pending)} over threshold=${String(config.copyGen.consumerBacklogAlertThreshold)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function buildStubFromPayload(
  payload: Record<string, unknown>,
): { title: string; teaser: string } | null {
  const title = payload["title"];
  const teaser = payload["teaser"];
  if (typeof title !== "string" || typeof teaser !== "string") {
    return null;
  }
  return { title, teaser };
}

function extractCoachId(coach: unknown): number | null {
  if (coach === null || typeof coach !== "object" || Array.isArray(coach)) {
    return null;
  }
  const id = (coach as Record<string, unknown>)["id"];
  return typeof id === "number" ? id : null;
}

function resolveLanguageFromContext(raw: unknown): SupportedLanguage {
  if (typeof raw !== "string") {
    return "en";
  }
  return resolveLanguage(raw);
}

async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }
  const concurrency = Math.max(1, Math.min(limit, items.length));
  let nextIndex = 0;
  const runOne = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const idx = nextIndex++;
      const item = items[idx];
      if (item !== undefined) {
        await worker(item);
      }
    }
  };
  const runners = Array.from({ length: concurrency }, async () => runOne());
  await Promise.all(runners);
}
