import {
  computeCopyInputHash,
  type CopyInputHashInputs,
} from "./copy-input-hash.js";

function baseInputs(
  overrides: Partial<CopyInputHashInputs> = {},
): CopyInputHashInputs {
  return {
    kind: "daily_check_in",
    language: "en",
    coachId: 1,
    scheduledForUtc: new Date("2026-04-20T12:00:00.000Z"),
    memoryHooks: { a: 1, b: 2 },
    kindSpecific: { target_local_hour: 9, timezone: "UTC" },
    suppressStreakCopy: false,
    ...overrides,
  };
}

describe("computeCopyInputHash", () => {
  it("should produce the same hash for identical inputs", () => {
    const a = computeCopyInputHash(baseInputs());
    const b = computeCopyInputHash(baseInputs());

    expect(a).toBe(b);
  });

  it("should ignore key order inside memoryHooks (canonical JSON)", () => {
    const a = computeCopyInputHash(baseInputs({ memoryHooks: { a: 1, b: 2 } }));
    const b = computeCopyInputHash(baseInputs({ memoryHooks: { b: 2, a: 1 } }));

    expect(a).toBe(b);
  });

  it("should ignore key order inside kindSpecific (canonical JSON)", () => {
    const a = computeCopyInputHash(
      baseInputs({
        kindSpecific: { target_local_hour: 9, timezone: "UTC" },
      }),
    );
    const b = computeCopyInputHash(
      baseInputs({
        kindSpecific: { timezone: "UTC", target_local_hour: 9 },
      }),
    );

    expect(a).toBe(b);
  });

  it("should preserve array order inside memoryHooks", () => {
    const a = computeCopyInputHash(
      baseInputs({ memoryHooks: { history: ["x", "y"] } }),
    );
    const b = computeCopyInputHash(
      baseInputs({ memoryHooks: { history: ["y", "x"] } }),
    );

    expect(a).not.toBe(b);
  });

  it("should flip when scheduledForUtc crosses a 15-min slot boundary", () => {
    const firstSlot = computeCopyInputHash(
      baseInputs({ scheduledForUtc: new Date("2026-04-20T12:00:00.000Z") }),
    );
    const sameSlot = computeCopyInputHash(
      baseInputs({ scheduledForUtc: new Date("2026-04-20T12:14:59.000Z") }),
    );
    const nextSlot = computeCopyInputHash(
      baseInputs({ scheduledForUtc: new Date("2026-04-20T12:15:00.000Z") }),
    );

    expect(firstSlot).toBe(sameSlot);
    expect(firstSlot).not.toBe(nextSlot);
  });

  it("should flip when kind changes", () => {
    const a = computeCopyInputHash(baseInputs({ kind: "daily_check_in" }));
    const b = computeCopyInputHash(baseInputs({ kind: "milestone_preview" }));

    expect(a).not.toBe(b);
  });

  it("should flip when language changes", () => {
    const a = computeCopyInputHash(baseInputs({ language: "en" }));
    const b = computeCopyInputHash(baseInputs({ language: "fr" }));

    expect(a).not.toBe(b);
  });

  it("should flip when coachId changes", () => {
    const a = computeCopyInputHash(baseInputs({ coachId: 1 }));
    const b = computeCopyInputHash(baseInputs({ coachId: 2 }));

    expect(a).not.toBe(b);
  });

  it("should flip when suppressStreakCopy toggles", () => {
    const a = computeCopyInputHash(baseInputs({ suppressStreakCopy: false }));
    const b = computeCopyInputHash(baseInputs({ suppressStreakCopy: true }));

    expect(a).not.toBe(b);
  });

  it("should produce a 64-char hex string (sha256)", () => {
    const hash = computeCopyInputHash(baseInputs());

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
