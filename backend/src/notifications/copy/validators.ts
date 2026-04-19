// Three-stage validator pipeline for notification copy-gen output (M2.9.2).
//
// Stage order is load-bearing:
//   1. Parse + required-field  (fatal, errorCode='parse_error')
//      — raw LLM string must decode to {title: string, body: string}
//        with both fields non-empty after trim.
//   2. Length clamp            (NON-fatal, errorCode='truncated')
//      — hard-truncate title to 40 chars and body to 180 chars. The
//        generation row keeps the truncated output; the job is still
//        valid. This exists so a slightly-long LLM response doesn't
//        force a full fallback to stub copy.
//   3. Semantic scanners       (fatal)
//      — banned-phrase scan (errorCode='banned_phrase') and, when
//        suppressStreakCopy is set, a streak-stem scan
//        (errorCode='streak_mention_forbidden'). Both scans run over
//        title + body combined, in the target language.
//
// Return shape always surfaces `clampedTitle` and `clampedBody`; the
// caller stores these on the generation row regardless of outcome. The
// `errorCode` distinguishes the three terminal states:
//   - undefined  → clean pass, status='generated'
//   - 'truncated'→ non-fatal clamp, status='generated'
//   - anything else → fatal, status='failed'

import { findBannedPhrase, findStreakMention } from "./banned-phrases.js";
import type { SupportedLanguage } from "./fallbacks.js";

export const COPY_GEN_ERROR_CODE = {
  PARSE_ERROR: "parse_error",
  TRUNCATED: "truncated",
  BANNED_PHRASE: "banned_phrase",
  STREAK_MENTION_FORBIDDEN: "streak_mention_forbidden",
  TIMEOUT: "timeout",
  HTTP_ERROR: "http_error",
  RATE_LIMITED: "rate_limited",
  PROVIDER_ERROR: "provider_error",
  BUDGET_EXCEEDED: "budget_exceeded",
} as const;

export type CopyGenErrorCode =
  (typeof COPY_GEN_ERROR_CODE)[keyof typeof COPY_GEN_ERROR_CODE];

// Matches the APNs alert contract consumed by notifications.service.ts.
// Producers use {title, teaser} at stub-insert time; the dispatcher
// (M2.9.3) will map stub.teaser → body when falling back.
export interface CopyOutput {
  readonly title: string;
  readonly body: string;
}

export const COPY_OUTPUT_TITLE_MAX = 40;
export const COPY_OUTPUT_BODY_MAX = 180;

// JSON schema passed to OpenRouter's `response_format` for structured
// output. Deliberately loose on maxLength because the length clamp
// stage is non-fatal — we'd rather salvage a slightly-over output than
// force a full retry.
export const COPY_OUTPUT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "body"],
  properties: {
    title: { type: "string", minLength: 1 },
    body: { type: "string", minLength: 1 },
  },
} as const;

export type ValidationResult =
  | {
      readonly status: "generated";
      readonly output: CopyOutput;
      readonly errorCode: typeof COPY_GEN_ERROR_CODE.TRUNCATED | undefined;
    }
  | {
      readonly status: "failed";
      readonly errorCode: Exclude<
        CopyGenErrorCode,
        typeof COPY_GEN_ERROR_CODE.TRUNCATED
      >;
      readonly reason: string;
    };

export interface ValidateOptions {
  readonly language: SupportedLanguage;
  readonly suppressStreakCopy: boolean;
}

/**
 * Parse a raw LLM response string and run the full validator pipeline.
 * Use this when the caller has the raw JSON text; use `validateParsed`
 * when the caller already has a parsed object (e.g., from OpenAI SDK's
 * structured-output parsed field).
 */
export function validateRaw(
  raw: string,
  options: ValidateOptions,
): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      status: "failed",
      errorCode: COPY_GEN_ERROR_CODE.PARSE_ERROR,
      reason: `JSON.parse failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  return validateParsed(parsed, options);
}

/**
 * Run the validator pipeline against an already-parsed value.
 */
export function validateParsed(
  parsed: unknown,
  options: ValidateOptions,
): ValidationResult {
  const shapeOk = toCopyOutput(parsed);
  if (shapeOk === null) {
    return {
      status: "failed",
      errorCode: COPY_GEN_ERROR_CODE.PARSE_ERROR,
      reason:
        "Output does not match {title: string, body: string} with non-empty trimmed values.",
    };
  }

  const { clamped, didClamp } = clampLengths(shapeOk);

  const combined = `${clamped.title}\n${clamped.body}`;
  const banned = findBannedPhrase(combined, options.language);
  if (banned !== null) {
    return {
      status: "failed",
      errorCode: COPY_GEN_ERROR_CODE.BANNED_PHRASE,
      reason: `Banned phrase stem "${banned.pattern}" in ${banned.language} output.`,
    };
  }

  if (options.suppressStreakCopy) {
    const streak = findStreakMention(combined, options.language);
    if (streak !== null) {
      return {
        status: "failed",
        errorCode: COPY_GEN_ERROR_CODE.STREAK_MENTION_FORBIDDEN,
        reason: `Streak stem "${streak.pattern}" in ${streak.language} output while suppressStreakCopy=true.`,
      };
    }
  }

  return {
    status: "generated",
    output: clamped,
    errorCode: didClamp ? COPY_GEN_ERROR_CODE.TRUNCATED : undefined,
  };
}

function toCopyOutput(value: unknown): CopyOutput | null {
  if (value === null || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const rawTitle = record.title;
  const rawBody = record.body;
  if (typeof rawTitle !== "string" || typeof rawBody !== "string") {
    return null;
  }
  const title = rawTitle.trim();
  const body = rawBody.trim();
  if (title.length === 0 || body.length === 0) {
    return null;
  }
  return { title, body };
}

function clampLengths(output: CopyOutput): {
  clamped: CopyOutput;
  didClamp: boolean;
} {
  const isTitleClamped = output.title.length > COPY_OUTPUT_TITLE_MAX;
  const isBodyClamped = output.body.length > COPY_OUTPUT_BODY_MAX;
  if (!isTitleClamped && !isBodyClamped) {
    return { clamped: output, didClamp: false };
  }
  return {
    clamped: {
      title: isTitleClamped
        ? output.title.slice(0, COPY_OUTPUT_TITLE_MAX)
        : output.title,
      body: isBodyClamped
        ? output.body.slice(0, COPY_OUTPUT_BODY_MAX)
        : output.body,
    },
    didClamp: true,
  };
}
