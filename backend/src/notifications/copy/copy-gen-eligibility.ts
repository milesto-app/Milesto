// M2.9.3 — per-kind + per-user copy-gen eligibility.
//
// Producers call `resolveCopyGenInsertMetadata` when building the outbox row.
// The helper returns the exact lifecycle columns to write so that the
// pre-dispatch consumer (or, for short-fuse kinds, the producer's own
// post-commit runner) picks the job up from the correct state.
//
// Policy buckets (from notification-plan.md § M2.9.3):
//   - skip_stub     — never runs through copy-gen. Dispatcher renders the
//                     stub verbatim.
//   - pre_dispatch  — scheduled with ≥ ~15 min lead time. The copy-gen
//                     consumer claims via `claim_notification_copy` and
//                     generates in the background.
//   - short_fuse    — near-immediate (celebration events, streak_milestone).
//                     Producer owns generation post-commit via setImmediate.
//                     Job is written with copy_status='generating' so the
//                     pre-dispatch consumer never double-claims. Orphan
//                     recovery reclaims if the producer crashes.

import { createHash } from "node:crypto";

import { config } from "../../config/app.config.js";
import {
  NOTIFICATION_KIND,
  type NotificationKind,
} from "../outbox/outbox.types.js";
import { computeCopyInputHash } from "./copy-input-hash.js";
import type { SupportedLanguage } from "./fallbacks.js";

export const COPY_GEN_POLICY = {
  SKIP_STUB: "skip_stub",
  PRE_DISPATCH: "pre_dispatch",
  SHORT_FUSE: "short_fuse",
} as const;

export type CopyGenPolicy =
  (typeof COPY_GEN_POLICY)[keyof typeof COPY_GEN_POLICY];

const POLICY_BY_KIND: Readonly<Record<NotificationKind, CopyGenPolicy>> = {
  // Bodies are inherently user- or coach-authored; copy-gen adds no value.
  [NOTIFICATION_KIND.COACH_REPLY_READY]: COPY_GEN_POLICY.SKIP_STUB,
  [NOTIFICATION_KIND.IMPLEMENTATION_INTENTION]: COPY_GEN_POLICY.SKIP_STUB,
  // Pre-dispatch: scheduled jobs with ≥ 15 min lead time.
  [NOTIFICATION_KIND.DAILY_CHECK_IN]: COPY_GEN_POLICY.PRE_DISPATCH,
  [NOTIFICATION_KIND.STREAK_AT_RISK]: COPY_GEN_POLICY.PRE_DISPATCH,
  [NOTIFICATION_KIND.STREAK_BROKEN]: COPY_GEN_POLICY.PRE_DISPATCH,
  [NOTIFICATION_KIND.MILESTONE_PREVIEW]: COPY_GEN_POLICY.PRE_DISPATCH,
  [NOTIFICATION_KIND.COACH_PROACTIVE]: COPY_GEN_POLICY.PRE_DISPATCH,
  [NOTIFICATION_KIND.WINBACK_STEP]: COPY_GEN_POLICY.PRE_DISPATCH,
  // Short-fuse: fire soon after their trigger event. Producer owns gen.
  [NOTIFICATION_KIND.STREAK_MILESTONE]: COPY_GEN_POLICY.SHORT_FUSE,
  [NOTIFICATION_KIND.MILESTONE_HIT]: COPY_GEN_POLICY.SHORT_FUSE,
  [NOTIFICATION_KIND.GOAL_HIT]: COPY_GEN_POLICY.SHORT_FUSE,
  [NOTIFICATION_KIND.WEEK_COMPLETED]: COPY_GEN_POLICY.SHORT_FUSE,
  // Kinds that don't exist yet in M2 / not wired through copy-gen:
  [NOTIFICATION_KIND.ROADMAP_GENERATED]: COPY_GEN_POLICY.SKIP_STUB,
  [NOTIFICATION_KIND.WEEKLY_PLAN_PUBLISHED]: COPY_GEN_POLICY.SKIP_STUB,
  [NOTIFICATION_KIND.PLAN_NOT_GENERATED]: COPY_GEN_POLICY.SKIP_STUB,
  [NOTIFICATION_KIND.WEEKLY_DEBRIEF_PROMPT]: COPY_GEN_POLICY.SKIP_STUB,
  [NOTIFICATION_KIND.MILESTONE_COUNTDOWN]: COPY_GEN_POLICY.SKIP_STUB,
  [NOTIFICATION_KIND.GOAL_DEADLINE_COUNTDOWN]: COPY_GEN_POLICY.SKIP_STUB,
  [NOTIFICATION_KIND.WEEK_COMPLETION_GAP]: COPY_GEN_POLICY.SKIP_STUB,
  [NOTIFICATION_KIND.UNEXPECTED_WIN]: COPY_GEN_POLICY.SKIP_STUB,
  [NOTIFICATION_KIND.STALE_TASKS]: COPY_GEN_POLICY.SKIP_STUB,
};

export function copyGenPolicyForKind(kind: NotificationKind): CopyGenPolicy {
  return POLICY_BY_KIND[kind];
}

// ---------------------------------------------------------------------------
// Eligibility + metadata resolution
// ---------------------------------------------------------------------------

export const COPY_GEN_STATUS = {
  PENDING: "pending",
  GENERATING: "generating",
  SKIPPED_STUB: "skipped_stub",
} as const;

export type CopyGenStatus =
  (typeof COPY_GEN_STATUS)[keyof typeof COPY_GEN_STATUS];

export interface CopyGenInsertMetadata {
  readonly copyStatus: CopyGenStatus;
  readonly copyInputHash: string | null;
  readonly copyClaimedBy: string | null;
  readonly copyClaimedAt: Date | null;
  readonly copyAttempts: number;
  readonly policy: CopyGenPolicy;
}

export interface CopyGenEligibilityInputs {
  readonly userId: string;
  readonly kind: NotificationKind;
  readonly language: SupportedLanguage;
  readonly coachId: number | null;
  readonly scheduledForUtc: Date;
  readonly memoryHooks: Readonly<Record<string, unknown>>;
  readonly kindSpecific: Readonly<Record<string, unknown>>;
  readonly suppressStreakCopy: boolean;
  /** Required for short-fuse kinds; ignored otherwise. */
  readonly producerName?: string;
}

export function resolveCopyGenInsertMetadata(
  inputs: CopyGenEligibilityInputs,
): CopyGenInsertMetadata {
  const policy = copyGenPolicyForKind(inputs.kind);

  if (policy === COPY_GEN_POLICY.SKIP_STUB || !isKindEligible(inputs.kind)) {
    return skipStubMetadata(policy);
  }
  if (!isUserInRolloutBucket(inputs.userId)) {
    return skipStubMetadata(policy);
  }

  const hash = computeCopyInputHash(inputs);

  if (policy === COPY_GEN_POLICY.SHORT_FUSE) {
    if (inputs.producerName === undefined || inputs.producerName === "") {
      throw new Error(
        `Short-fuse kind ${inputs.kind} requires producerName on CopyGenEligibilityInputs`,
      );
    }
    return {
      copyStatus: COPY_GEN_STATUS.GENERATING,
      copyInputHash: hash,
      copyClaimedBy: `producer:${inputs.producerName}`,
      copyClaimedAt: new Date(),
      copyAttempts: 1,
      policy,
    };
  }

  return {
    copyStatus: COPY_GEN_STATUS.PENDING,
    copyInputHash: hash,
    copyClaimedBy: null,
    copyClaimedAt: null,
    copyAttempts: 0,
    policy,
  };
}

function skipStubMetadata(policy: CopyGenPolicy): CopyGenInsertMetadata {
  return {
    copyStatus: COPY_GEN_STATUS.SKIPPED_STUB,
    copyInputHash: null,
    copyClaimedBy: null,
    copyClaimedAt: null,
    copyAttempts: 0,
    policy,
  };
}

function isKindEligible(kind: NotificationKind): boolean {
  if (!config.copyGen.globalEnabled) {
    return false;
  }
  const allowlist = config.copyGen.enabledKinds;
  if (allowlist === null) {
    return true;
  }
  return allowlist.has(kind);
}

const ROLLOUT_BUCKET_COUNT = 100;
const ROLLOUT_HASH_BYTES = 4;
const BYTE_MASK = 0xff;
const BITS_PER_BYTE = 8;

function isUserInRolloutBucket(userId: string): boolean {
  const percent = config.copyGen.rolloutPercent;
  if (percent >= ROLLOUT_BUCKET_COUNT) {
    return true;
  }
  if (percent <= 0) {
    return false;
  }
  const digest = createHash("sha256").update(userId).digest();
  let value = 0;
  for (let i = 0; i < ROLLOUT_HASH_BYTES; i++) {
    const byte = digest[i] ?? 0;
    value = (value << BITS_PER_BYTE) | (byte & BYTE_MASK);
  }
  // Zero out the sign bit so left-shift can't produce a negative 32-bit int.
  const unsigned = value >>> 0;
  return unsigned % ROLLOUT_BUCKET_COUNT < percent;
}
