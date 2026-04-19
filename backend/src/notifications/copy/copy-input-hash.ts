// M2.9.3 — copy-gen input-hash helper.
//
// The pre-dispatch consumer and the gate/reschedule paths both need a stable
// fingerprint of "what does the LLM need to see for this job". When anything
// in that fingerprint changes (e.g. the dispatcher defers a job into the next
// 15-min slot to avoid quiet hours), we want the consumer to regenerate: the
// previously-generated copy may no longer fit the new context (think
// "morning" copy that deferred to the afternoon slot).
//
// Hash inputs (per notification-plan.md § M2.9.3):
//   - kind
//   - language
//   - coach_id
//   - floor(scheduled_for_utc_epoch_seconds / 900)  — 15-min slot bucket
//   - canonical_json(memory_hooks)
//   - canonical_json(kind_specific)
//   - suppress_streak_copy
//
// "canonical" = deterministic: keys sorted recursively so
// {"a":1,"b":2} and {"b":2,"a":1} hash identically. Arrays preserve order —
// they encode meaning, not set membership.

import { createHash } from "node:crypto";

const SLOT_MINUTES = 15;
const SECONDS_PER_MINUTE = 60;
const SLOT_SECONDS = SLOT_MINUTES * SECONDS_PER_MINUTE;
const MS_PER_SECOND = 1000;

export interface CopyInputHashInputs {
  readonly kind: string;
  readonly language: string;
  readonly coachId: number | null;
  readonly scheduledForUtc: Date;
  readonly memoryHooks: Readonly<Record<string, unknown>>;
  readonly kindSpecific: Readonly<Record<string, unknown>>;
  readonly suppressStreakCopy: boolean;
}

export function computeCopyInputHash(inputs: CopyInputHashInputs): string {
  const slotBucket = Math.floor(
    inputs.scheduledForUtc.getTime() / MS_PER_SECOND / SLOT_SECONDS,
  );
  const canonical = [
    inputs.kind,
    inputs.language,
    inputs.coachId,
    slotBucket,
    canonicalize(inputs.memoryHooks),
    canonicalize(inputs.kindSpecific),
    inputs.suppressStreakCopy,
  ];
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function compareKeys(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  const entries = Object.entries(value as Record<string, unknown>);
  entries.sort(([a], [b]) => compareKeys(a, b));
  const ordered: Record<string, unknown> = {};
  for (const [key, val] of entries) {
    ordered[key] = canonicalize(val);
  }
  return ordered;
}
