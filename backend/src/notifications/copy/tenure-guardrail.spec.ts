import { isWithinTenureGuardrail } from "./tenure-guardrail.js";

describe("isWithinTenureGuardrail", () => {
  const now = new Date("2026-04-19T12:00:00.000Z");

  it("should return false when tenureStartDate is null", () => {
    expect(isWithinTenureGuardrail(null, now)).toBe(false);
  });

  it("should return false when tenureStartDate is unparseable", () => {
    expect(isWithinTenureGuardrail("not-a-date", now)).toBe(false);
  });

  it("should return true when tenure started today", () => {
    expect(isWithinTenureGuardrail("2026-04-19", now)).toBe(true);
  });

  it("should return true at 59 days tenure", () => {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - 59);
    const iso = start.toISOString().slice(0, 10);
    expect(isWithinTenureGuardrail(iso, now)).toBe(true);
  });

  it("should return false at exactly 60 days tenure", () => {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - 60);
    const iso = start.toISOString().slice(0, 10);
    expect(isWithinTenureGuardrail(iso, now)).toBe(false);
  });

  it("should return false for long-tenured users", () => {
    expect(isWithinTenureGuardrail("2025-01-01", now)).toBe(false);
  });
});
