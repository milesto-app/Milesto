import {
  getPersonaDefaultHour,
  PERSONA_BUCKET,
  resolvePersonaBucket,
} from "./persona-defaults.js";

describe("persona-defaults", () => {
  describe("resolvePersonaBucket", () => {
    it("should map strict (coach 3) to drill", () => {
      expect(resolvePersonaBucket(3)).toBe(PERSONA_BUCKET.DRILL);
    });

    it("should map motivateur (coach 1) to standard", () => {
      expect(resolvePersonaBucket(1)).toBe(PERSONA_BUCKET.STANDARD);
    });

    it("should map complice (coach 4) to standard", () => {
      expect(resolvePersonaBucket(4)).toBe(PERSONA_BUCKET.STANDARD);
    });

    it("should map zen (coach 2) to gentle", () => {
      expect(resolvePersonaBucket(2)).toBe(PERSONA_BUCKET.GENTLE);
    });

    it("should fall back to standard when coachId is null", () => {
      expect(resolvePersonaBucket(null)).toBe(PERSONA_BUCKET.STANDARD);
    });

    it("should fall back to standard for unknown coach id", () => {
      expect(resolvePersonaBucket(999)).toBe(PERSONA_BUCKET.STANDARD);
    });
  });

  describe("getPersonaDefaultHour", () => {
    it("should return 7 for strict (drill)", () => {
      expect(getPersonaDefaultHour(3)).toBe(7);
    });

    it("should return 19 for motivateur (standard)", () => {
      expect(getPersonaDefaultHour(1)).toBe(19);
    });

    it("should return 19 for complice (standard)", () => {
      expect(getPersonaDefaultHour(4)).toBe(19);
    });

    it("should return 20 for zen (gentle)", () => {
      expect(getPersonaDefaultHour(2)).toBe(20);
    });

    it("should fall back to 19 when coachId is null", () => {
      expect(getPersonaDefaultHour(null)).toBe(19);
    });
  });
});
