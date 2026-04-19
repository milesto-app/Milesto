// Copy-gen orchestrator (M2.9.2).
//
// Responsibility:
//   1. Resolve which persona × language prompt to use for the given
//      job context.
//   2. Serialize the job context into a user-message payload the LLM
//      can consume.
//   3. Run the retry ladder: standard prompt → strict prompt on failure
//      → terminal fail. Enforce a 9 s wall-clock budget across the
//      whole ladder (each call already has its own 4 s timeout).
//   4. Run the validator pipeline against each attempt's output.
//   5. Emit a structured log record with the outcome.
//
// This module does NOT write database rows. The pre-dispatch consumer
// (M2.9.3) is the only caller that persists `notification_copy_generations`
// rows and mutates `notification_jobs.copy_status`. Keeping generation
// pure here means it can be exercised end-to-end in tests without a
// Supabase client.

import { Injectable, Logger } from "@nestjs/common";

import { COACH_BY_ID } from "../../coach/coaches.config.js";
import { config } from "../../config/app.config.js";
import type { ClientCallResult } from "./copy-gen.client.js";
import { CopyGenClient } from "./copy-gen.client.js";
import type { SupportedLanguage } from "./fallbacks.js";
import { buildStrictSystemPrompt } from "./prompts/strict-prompt.js";
import type { CoachPersonality } from "./prompts/system-prompts.js";
import {
  COACH_PERSONALITIES,
  getSystemPrompt,
} from "./prompts/system-prompts.js";
import type {
  CopyGenErrorCode,
  CopyOutput,
  ValidationResult,
} from "./validators.js";
import {
  COPY_GEN_ERROR_CODE,
  COPY_OUTPUT_JSON_SCHEMA,
  validateRaw,
} from "./validators.js";

// Shape passed in by the caller (producer or pre-dispatch consumer).
// Intentionally dumb types — the consumer in M2.9.3 will assemble this
// from a SQL row and pass it in.
export interface CopyGenJobContext {
  readonly jobId: string;
  readonly kind: string;
  readonly language: SupportedLanguage;
  readonly coachId: number | null;
  readonly stub: { readonly title: string; readonly teaser: string };
  readonly memoryHooks: Readonly<Record<string, unknown>>;
  readonly kindSpecific: Readonly<Record<string, unknown>>;
  readonly suppressStreakCopy: boolean;
  readonly inputHash: string;
  readonly attemptNo: number;
  readonly modelOverride?: string;
}

export interface CopyGenResult {
  readonly status: "generated" | "failed";
  readonly output?: CopyOutput;
  readonly errorCode?: CopyGenErrorCode;
  readonly promptVersion: string;
  readonly personality: CoachPersonality;
  readonly model: string;
  readonly providerStatus: number | null;
  readonly latencyMs: number;
  readonly attemptsUsed: number;
}

const FALLBACK_PERSONALITY: CoachPersonality = "motivateur";
const USER_PROMPT_INDENT = 2;

interface AttemptContext {
  readonly personality: CoachPersonality;
  readonly prompt: ReturnType<typeof getSystemPrompt>;
  readonly model: string;
  readonly userPrompt: string;
  readonly language: SupportedLanguage;
  readonly suppressStreakCopy: boolean;
}

type AttemptOutcome =
  | { readonly kind: "terminal"; readonly result: CopyGenResult }
  | {
      readonly kind: "retry";
      readonly clientResult: ClientCallResult;
      readonly validation: ValidationResult | null;
    };

@Injectable()
export class CopyGenService {
  private readonly logger = new Logger(CopyGenService.name);

  constructor(private readonly client: CopyGenClient) {}

  public async generate(context: CopyGenJobContext): Promise<CopyGenResult> {
    const personality = this.resolvePersonality(context.coachId);
    const prompt = getSystemPrompt(personality, context.language);
    const attemptCtx: AttemptContext = {
      personality,
      prompt,
      model: context.modelOverride ?? config.copyGen.defaultModel,
      userPrompt: buildUserPrompt(context),
      language: context.language,
      suppressStreakCopy: context.suppressStreakCopy,
    };
    const deadline = Date.now() + config.copyGen.totalBudgetMs;

    let lastClientResult: ClientCallResult | null = null;
    let lastValidation: ValidationResult | null = null;
    let attemptsUsed = 0;

    for (let attempt = 1; attempt <= config.copyGen.maxAttempts; attempt++) {
      if (Date.now() >= deadline) {
        return buildBudgetFailure({
          personality,
          promptVersion: prompt.promptVersion,
          model: attemptCtx.model,
          lastClientResult,
          attemptsUsed,
        });
      }
      attemptsUsed = attempt;

      const outcome = await this.runAttempt(attempt, attemptCtx, attemptsUsed);
      if (outcome.kind === "terminal") {
        return outcome.result;
      }
      lastClientResult = outcome.clientResult;
      lastValidation = outcome.validation;
    }

    return buildExhaustedResult({
      personality,
      promptVersion: prompt.promptVersion,
      model: attemptCtx.model,
      lastClientResult,
      lastValidation,
      attemptsUsed,
    });
  }

  private async runAttempt(
    attempt: number,
    ctx: AttemptContext,
    attemptsUsed: number,
  ): Promise<AttemptOutcome> {
    const systemPrompt =
      attempt === 1 ? ctx.prompt.text : buildStrictSystemPrompt(ctx.prompt);
    const clientResult = await this.client.call({
      model: ctx.model,
      systemPrompt,
      userPrompt: ctx.userPrompt,
      jsonSchema: COPY_OUTPUT_JSON_SCHEMA,
      jsonSchemaName: "notification_copy",
    });

    if (!clientResult.ok) {
      if (!shouldRetryAfterClientFailure(clientResult.errorCode)) {
        return {
          kind: "terminal",
          result: toClientFailureResult({
            personality: ctx.personality,
            promptVersion: ctx.prompt.promptVersion,
            model: ctx.model,
            clientResult,
            attemptsUsed,
          }),
        };
      }
      return { kind: "retry", clientResult, validation: null };
    }

    const validation = validateRaw(clientResult.rawContent, {
      language: ctx.language,
      suppressStreakCopy: ctx.suppressStreakCopy,
    });

    if (validation.status === "generated") {
      return {
        kind: "terminal",
        result: {
          status: "generated",
          output: validation.output,
          errorCode: validation.errorCode,
          promptVersion: ctx.prompt.promptVersion,
          personality: ctx.personality,
          model: ctx.model,
          providerStatus: clientResult.providerStatus,
          latencyMs: clientResult.latencyMs,
          attemptsUsed,
        },
      };
    }

    if (!shouldRetryAfterValidation(validation.errorCode)) {
      return {
        kind: "terminal",
        result: {
          status: "failed",
          errorCode: validation.errorCode,
          promptVersion: ctx.prompt.promptVersion,
          personality: ctx.personality,
          model: ctx.model,
          providerStatus: clientResult.providerStatus,
          latencyMs: clientResult.latencyMs,
          attemptsUsed,
        },
      };
    }
    return { kind: "retry", clientResult, validation };
  }

  private resolvePersonality(coachId: number | null): CoachPersonality {
    if (coachId === null) {
      return FALLBACK_PERSONALITY;
    }
    const coach = COACH_BY_ID.get(coachId);
    if (coach === undefined) {
      return FALLBACK_PERSONALITY;
    }
    const match = COACH_PERSONALITIES.find((p) => p === coach.personality);
    return match ?? FALLBACK_PERSONALITY;
  }
}

function buildExhaustedResult(args: {
  personality: CoachPersonality;
  promptVersion: string;
  model: string;
  lastClientResult: ClientCallResult | null;
  lastValidation: ValidationResult | null;
  attemptsUsed: number;
}): CopyGenResult {
  if (args.lastValidation !== null && args.lastValidation.status === "failed") {
    return {
      status: "failed",
      errorCode: args.lastValidation.errorCode,
      promptVersion: args.promptVersion,
      personality: args.personality,
      model: args.model,
      providerStatus: args.lastClientResult?.providerStatus ?? null,
      latencyMs: args.lastClientResult?.latencyMs ?? 0,
      attemptsUsed: args.attemptsUsed,
    };
  }
  if (args.lastClientResult !== null && !args.lastClientResult.ok) {
    return toClientFailureResult({
      personality: args.personality,
      promptVersion: args.promptVersion,
      model: args.model,
      clientResult: args.lastClientResult,
      attemptsUsed: args.attemptsUsed,
    });
  }
  return {
    status: "failed",
    errorCode: COPY_GEN_ERROR_CODE.PROVIDER_ERROR,
    promptVersion: args.promptVersion,
    personality: args.personality,
    model: args.model,
    providerStatus: null,
    latencyMs: 0,
    attemptsUsed: args.attemptsUsed,
  };
}

function shouldRetryAfterClientFailure(code: CopyGenErrorCode): boolean {
  // Timeout and HTTP/provider failures are already retried once inside
  // the client for 429/5xx. If the client returns a terminal error
  // here, retrying the whole ladder won't help — we'd just burn budget.
  return code === COPY_GEN_ERROR_CODE.TIMEOUT;
}

function shouldRetryAfterValidation(code: CopyGenErrorCode): boolean {
  return (
    code === COPY_GEN_ERROR_CODE.PARSE_ERROR ||
    code === COPY_GEN_ERROR_CODE.BANNED_PHRASE ||
    code === COPY_GEN_ERROR_CODE.STREAK_MENTION_FORBIDDEN
  );
}

function buildUserPrompt(context: CopyGenJobContext): string {
  const payload = {
    kind: context.kind,
    language: context.language,
    suppress_streak_copy: context.suppressStreakCopy,
    stub_copy_for_reference: {
      title: context.stub.title,
      teaser: context.stub.teaser,
    },
    kind_specific: context.kindSpecific,
    memory_hooks: context.memoryHooks,
  };
  return JSON.stringify(payload, null, USER_PROMPT_INDENT);
}

function toClientFailureResult(args: {
  personality: CoachPersonality;
  promptVersion: string;
  model: string;
  clientResult: ClientCallResult;
  attemptsUsed: number;
}): CopyGenResult {
  const { clientResult } = args;
  if (clientResult.ok) {
    throw new Error("toClientFailureResult called with ok result");
  }
  return {
    status: "failed",
    errorCode: clientResult.errorCode,
    promptVersion: args.promptVersion,
    personality: args.personality,
    model: args.model,
    providerStatus: clientResult.providerStatus,
    latencyMs: clientResult.latencyMs,
    attemptsUsed: args.attemptsUsed,
  };
}

function buildBudgetFailure(args: {
  personality: CoachPersonality;
  promptVersion: string;
  model: string;
  lastClientResult: ClientCallResult | null;
  attemptsUsed: number;
}): CopyGenResult {
  return {
    status: "failed",
    errorCode: COPY_GEN_ERROR_CODE.BUDGET_EXCEEDED,
    promptVersion: args.promptVersion,
    personality: args.personality,
    model: args.model,
    providerStatus: args.lastClientResult?.providerStatus ?? null,
    latencyMs: args.lastClientResult?.latencyMs ?? 0,
    attemptsUsed: args.attemptsUsed,
  };
}
