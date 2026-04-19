import { config } from "../../config/app.config.js";
import { NOTIFICATION_KIND } from "../outbox/outbox.types.js";
import {
  COPY_GEN_POLICY,
  COPY_GEN_STATUS,
  type CopyGenEligibilityInputs,
  copyGenPolicyForKind,
  resolveCopyGenInsertMetadata,
} from "./copy-gen-eligibility.js";

function baseInputs(
  overrides: Partial<CopyGenEligibilityInputs> = {},
): CopyGenEligibilityInputs {
  return {
    userId: "user-uuid-1",
    kind: NOTIFICATION_KIND.DAILY_CHECK_IN,
    language: "en",
    coachId: 1,
    scheduledForUtc: new Date("2026-04-20T12:00:00.000Z"),
    memoryHooks: {},
    kindSpecific: { target_local_hour: 9 },
    suppressStreakCopy: false,
    ...overrides,
  };
}

describe("copyGenPolicyForKind", () => {
  it("returns skip_stub for coach_reply_ready and implementation_intention", () => {
    expect(copyGenPolicyForKind(NOTIFICATION_KIND.COACH_REPLY_READY)).toBe(
      COPY_GEN_POLICY.SKIP_STUB,
    );
    expect(
      copyGenPolicyForKind(NOTIFICATION_KIND.IMPLEMENTATION_INTENTION),
    ).toBe(COPY_GEN_POLICY.SKIP_STUB);
  });

  it("returns pre_dispatch for the scheduled kinds with lead time", () => {
    const preDispatchKinds = [
      NOTIFICATION_KIND.DAILY_CHECK_IN,
      NOTIFICATION_KIND.STREAK_AT_RISK,
      NOTIFICATION_KIND.STREAK_BROKEN,
      NOTIFICATION_KIND.MILESTONE_PREVIEW,
      NOTIFICATION_KIND.COACH_PROACTIVE,
      NOTIFICATION_KIND.WINBACK_STEP,
    ];
    for (const kind of preDispatchKinds) {
      expect(copyGenPolicyForKind(kind)).toBe(COPY_GEN_POLICY.PRE_DISPATCH);
    }
  });

  it("returns short_fuse for celebrations and streak_milestone", () => {
    const shortFuseKinds = [
      NOTIFICATION_KIND.STREAK_MILESTONE,
      NOTIFICATION_KIND.MILESTONE_HIT,
      NOTIFICATION_KIND.GOAL_HIT,
      NOTIFICATION_KIND.WEEK_COMPLETED,
    ];
    for (const kind of shortFuseKinds) {
      expect(copyGenPolicyForKind(kind)).toBe(COPY_GEN_POLICY.SHORT_FUSE);
    }
  });
});

describe("resolveCopyGenInsertMetadata", () => {
  const saved = {
    globalEnabled: config.copyGen.globalEnabled,
    enabledKinds: config.copyGen.enabledKinds,
    rolloutPercent: config.copyGen.rolloutPercent,
  };

  afterEach(() => {
    config.copyGen.globalEnabled = saved.globalEnabled;
    config.copyGen.enabledKinds = saved.enabledKinds;
    config.copyGen.rolloutPercent = saved.rolloutPercent;
  });

  it("returns pending + input hash for an eligible pre-dispatch kind at full rollout", () => {
    config.copyGen.globalEnabled = true;
    config.copyGen.enabledKinds = null;
    config.copyGen.rolloutPercent = 100;

    const meta = resolveCopyGenInsertMetadata(baseInputs());

    expect(meta.copyStatus).toBe(COPY_GEN_STATUS.PENDING);
    expect(meta.copyInputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(meta.copyClaimedBy).toBeNull();
    expect(meta.copyClaimedAt).toBeNull();
    expect(meta.copyAttempts).toBe(0);
    expect(meta.policy).toBe(COPY_GEN_POLICY.PRE_DISPATCH);
  });

  it("returns generating + producer lease for a short-fuse kind", () => {
    config.copyGen.globalEnabled = true;
    config.copyGen.enabledKinds = null;
    config.copyGen.rolloutPercent = 100;

    const meta = resolveCopyGenInsertMetadata(
      baseInputs({
        kind: NOTIFICATION_KIND.GOAL_HIT,
        producerName: "goal-celebration",
      }),
    );

    expect(meta.copyStatus).toBe(COPY_GEN_STATUS.GENERATING);
    expect(meta.copyClaimedBy).toBe("producer:goal-celebration");
    expect(meta.copyClaimedAt).toBeInstanceOf(Date);
    expect(meta.copyAttempts).toBe(1);
    expect(meta.policy).toBe(COPY_GEN_POLICY.SHORT_FUSE);
  });

  it("throws when a short-fuse kind omits producerName", () => {
    config.copyGen.globalEnabled = true;
    config.copyGen.enabledKinds = null;
    config.copyGen.rolloutPercent = 100;

    expect(() =>
      resolveCopyGenInsertMetadata(
        baseInputs({ kind: NOTIFICATION_KIND.MILESTONE_HIT }),
      ),
    ).toThrow(/producerName/);
  });

  it("returns skipped_stub when COPY_GEN_GLOBAL_ENABLED=false", () => {
    config.copyGen.globalEnabled = false;

    const meta = resolveCopyGenInsertMetadata(baseInputs());

    expect(meta.copyStatus).toBe(COPY_GEN_STATUS.SKIPPED_STUB);
    expect(meta.copyInputHash).toBeNull();
  });

  it("returns skipped_stub when the kind is not in enabledKinds allowlist", () => {
    config.copyGen.globalEnabled = true;
    config.copyGen.enabledKinds = new Set(["milestone_preview"]);
    config.copyGen.rolloutPercent = 100;

    const meta = resolveCopyGenInsertMetadata(
      baseInputs({ kind: NOTIFICATION_KIND.DAILY_CHECK_IN }),
    );

    expect(meta.copyStatus).toBe(COPY_GEN_STATUS.SKIPPED_STUB);
  });

  it("excludes users outside the rollout bucket when rolloutPercent=0", () => {
    config.copyGen.globalEnabled = true;
    config.copyGen.enabledKinds = null;
    config.copyGen.rolloutPercent = 0;

    const meta = resolveCopyGenInsertMetadata(baseInputs());

    expect(meta.copyStatus).toBe(COPY_GEN_STATUS.SKIPPED_STUB);
  });

  it("deterministically bucket-assigns the same userId", () => {
    config.copyGen.globalEnabled = true;
    config.copyGen.enabledKinds = null;
    config.copyGen.rolloutPercent = 50;

    const a = resolveCopyGenInsertMetadata(baseInputs({ userId: "seed-x" }));
    const b = resolveCopyGenInsertMetadata(baseInputs({ userId: "seed-x" }));

    expect(a.copyStatus).toBe(b.copyStatus);
  });

  it("always returns skip_stub policy for skip_stub kinds, even when enabled", () => {
    config.copyGen.globalEnabled = true;
    config.copyGen.enabledKinds = null;
    config.copyGen.rolloutPercent = 100;

    const meta = resolveCopyGenInsertMetadata(
      baseInputs({ kind: NOTIFICATION_KIND.COACH_REPLY_READY }),
    );

    expect(meta.copyStatus).toBe(COPY_GEN_STATUS.SKIPPED_STUB);
    expect(meta.policy).toBe(COPY_GEN_POLICY.SKIP_STUB);
  });
});
