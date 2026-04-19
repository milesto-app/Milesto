// M2.9.3 — Short-fuse post-commit copy-gen runner.
//
// Celebrations (`milestone_hit`, `goal_hit`, `week_completed`,
// `streak_milestone`) fire near-immediately after their trigger event. They
// don't have the 15-min lead time the pre-dispatch consumer needs, so the
// producer runs generation itself, after its outbox insert has committed.
//
// Safety model:
//   - Outbox wrote `copy_status='generating'`, `copy_claimed_by='producer:<name>'`
//     inside the insert — the pre-dispatch consumer (which only claims
//     `pending`) cannot double-claim.
//   - This runner's LLM call is NEVER inside a DB transaction. It's fired via
//     `setImmediate` so it kicks off on the next event-loop tick, after the
//     producer's outbox.insert has returned.
//   - If this process dies mid-generation, orphan recovery (§M2.9.3 cron,
//     every 2 min) releases the `generating` lease back to `pending` so the
//     pre-dispatch consumer reclaims on the next tick — still well inside
//     the send window for short-fuse kinds.

import { Injectable, Logger } from "@nestjs/common";

import { SupabaseService } from "../../supabase/supabase.service.js";
import type { OutboxInsertResult } from "../outbox/outbox.service.js";
import { type CopyGenJobContext, CopyGenService } from "./copy-gen.service.js";
import { COPY_GEN_POLICY, COPY_GEN_STATUS } from "./copy-gen-eligibility.js";
import { persistCopyGenResult } from "./copy-gen-persist.js";
import type { SupportedLanguage } from "./fallbacks.js";

export interface PostCommitCopyGenInputs {
  readonly insertResult: OutboxInsertResult;
  readonly kind: string;
  readonly language: SupportedLanguage;
  readonly coachId: number | null;
  readonly stub: { readonly title: string; readonly teaser: string };
  readonly memoryHooks: Readonly<Record<string, unknown>>;
  readonly kindSpecific: Readonly<Record<string, unknown>>;
  readonly suppressStreakCopy: boolean;
}

@Injectable()
export class PostCommitCopyGenRunner {
  private readonly logger = new Logger(PostCommitCopyGenRunner.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly copyGenService: CopyGenService,
  ) {}

  /**
   * Called by short-fuse producers after `outbox.insert()` returns.
   * No-ops if the outbox's eligibility decision wasn't `short_fuse`
   * (e.g. rollout excluded this user, kill-switch disabled the kind),
   * in which case the dispatcher will render the stub at send time.
   */
  public runIfShortFuse(inputs: PostCommitCopyGenInputs): void {
    if (inputs.insertResult.status !== "inserted") {
      return;
    }
    const cg = inputs.insertResult.copyGen;
    if (
      cg === undefined ||
      cg.policy !== COPY_GEN_POLICY.SHORT_FUSE ||
      cg.copyStatus !== COPY_GEN_STATUS.GENERATING ||
      cg.copyInputHash === null
    ) {
      return;
    }
    const ctx: CopyGenJobContext = {
      jobId: inputs.insertResult.jobId,
      kind: inputs.kind,
      language: inputs.language,
      coachId: inputs.coachId,
      stub: inputs.stub,
      memoryHooks: inputs.memoryHooks,
      kindSpecific: inputs.kindSpecific,
      suppressStreakCopy: inputs.suppressStreakCopy,
      inputHash: cg.copyInputHash,
      attemptNo: cg.copyAttempts,
    };
    setImmediate(() => {
      void this.run(ctx);
    });
  }

  private async run(ctx: CopyGenJobContext): Promise<void> {
    try {
      const result = await this.copyGenService.generate(ctx);
      await persistCopyGenResult({
        supabaseService: this.supabaseService,
        logger: this.logger,
        ctx,
        result,
      });
    } catch (error) {
      this.logger.error(
        `Short-fuse copy-gen threw for job ${ctx.jobId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
