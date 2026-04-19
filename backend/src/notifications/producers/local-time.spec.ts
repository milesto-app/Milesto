import {
  computeNextDailyCheckInSlot,
  formatLocalDate,
  isInQuietHours,
  localToUtc,
  toLocalMoment,
} from "./local-time.js";

describe("local-time", () => {
  describe("toLocalMoment", () => {
    it("should convert UTC to Europe/Paris in winter when offset is +1h", () => {
      const moment = toLocalMoment(
        new Date("2026-01-15T10:00:00Z"),
        "Europe/Paris",
      );
      expect(moment).toEqual({
        year: 2026,
        month: 1,
        day: 15,
        hour: 11,
        minute: 0,
      });
    });

    it("should convert UTC to America/New_York in winter when offset is -5h", () => {
      const moment = toLocalMoment(
        new Date("2026-01-15T10:00:00Z"),
        "America/New_York",
      );
      expect(moment).toEqual({
        year: 2026,
        month: 1,
        day: 15,
        hour: 5,
        minute: 0,
      });
    });
  });

  describe("localToUtc", () => {
    it("should return correct UTC when given 19:00 Europe/Paris in winter", () => {
      const utc = localToUtc(
        { year: 2026, month: 1, day: 15, hour: 19, minute: 0 },
        "Europe/Paris",
      );
      expect(utc.toISOString()).toBe("2026-01-15T18:00:00.000Z");
    });

    it("should return correct UTC when given 19:00 America/New_York in winter", () => {
      const utc = localToUtc(
        { year: 2026, month: 1, day: 15, hour: 19, minute: 0 },
        "America/New_York",
      );
      expect(utc.toISOString()).toBe("2026-01-16T00:00:00.000Z");
    });

    it("should return correct UTC when given 19:00 Europe/Paris in summer (DST +2h)", () => {
      const utc = localToUtc(
        { year: 2026, month: 7, day: 15, hour: 19, minute: 0 },
        "Europe/Paris",
      );
      expect(utc.toISOString()).toBe("2026-07-15T17:00:00.000Z");
    });
  });

  describe("formatLocalDate", () => {
    it("should pad single-digit months and days", () => {
      expect(
        formatLocalDate({
          year: 2026,
          month: 1,
          day: 5,
          hour: 0,
          minute: 0,
        }),
      ).toBe("2026-01-05");
    });
  });

  describe("isInQuietHours", () => {
    it("should return true for hours inside a midnight-spanning window", () => {
      expect(isInQuietHours(23, 22, 7)).toBe(true);
      expect(isInQuietHours(2, 22, 7)).toBe(true);
      expect(isInQuietHours(6, 22, 7)).toBe(true);
    });

    it("should return false for hours outside a midnight-spanning window", () => {
      expect(isInQuietHours(7, 22, 7)).toBe(false);
      expect(isInQuietHours(21, 22, 7)).toBe(false);
      expect(isInQuietHours(12, 22, 7)).toBe(false);
    });

    it("should return true for hours inside a non-spanning window", () => {
      expect(isInQuietHours(10, 9, 12)).toBe(true);
      expect(isInQuietHours(11, 9, 12)).toBe(true);
    });

    it("should return false when start equals end", () => {
      expect(isInQuietHours(5, 10, 10)).toBe(false);
    });
  });

  describe("computeNextDailyCheckInSlot", () => {
    it("should schedule for today when target hour is later today local", () => {
      // 2026-04-20 10:00 UTC = 12:00 Paris. Target 19:00 Paris = 17:00 UTC same day.
      const slot = computeNextDailyCheckInSlot({
        now: new Date("2026-04-20T10:00:00Z"),
        timezone: "Europe/Paris",
        targetHour: 19,
        quietStart: 22,
        quietEnd: 7,
      });
      expect(slot.utc.toISOString()).toBe("2026-04-20T17:00:00.000Z");
      expect(slot.localDate).toBe("2026-04-20");
      expect(slot.localHour).toBe(19);
    });

    it("should schedule for tomorrow when target hour has already passed today local", () => {
      // 2026-04-20 22:00 UTC = 00:00 Paris next day. Target 19:00 Paris → 2026-04-21 19:00 Paris.
      const slot = computeNextDailyCheckInSlot({
        now: new Date("2026-04-20T22:00:00Z"),
        timezone: "Europe/Paris",
        targetHour: 19,
        quietStart: 22,
        quietEnd: 7,
      });
      expect(slot.localDate).toBe("2026-04-21");
      expect(slot.localHour).toBe(19);
      expect(slot.utc.toISOString()).toBe("2026-04-21T17:00:00.000Z");
    });

    it("should bump hour to quietEnd when target lands in quiet hours morning slot", () => {
      // Pathological: targetHour=3 with quiet 22-07. Should bump to 07:00 same local day.
      const slot = computeNextDailyCheckInSlot({
        now: new Date("2026-04-20T00:00:00Z"), // 02:00 Paris
        timezone: "Europe/Paris",
        targetHour: 3,
        quietStart: 22,
        quietEnd: 7,
      });
      expect(slot.localHour).toBe(7);
      expect(slot.localDate).toBe("2026-04-20");
    });

    it("should bump target into next day when target lands in quiet-hours evening slot", () => {
      // targetHour=23 with quiet 22-07 → bump to next day 07:00.
      const slot = computeNextDailyCheckInSlot({
        now: new Date("2026-04-20T10:00:00Z"), // 12:00 Paris
        timezone: "Europe/Paris",
        targetHour: 23,
        quietStart: 22,
        quietEnd: 7,
      });
      expect(slot.localHour).toBe(7);
      expect(slot.localDate).toBe("2026-04-21");
    });

    it("should schedule at exactly quietEnd when target equals quiet boundary", () => {
      // targetHour=7 with quiet 22-07 → 07:00 itself is NOT in quiet hours (end-exclusive).
      const slot = computeNextDailyCheckInSlot({
        now: new Date("2026-04-20T00:00:00Z"), // 02:00 Paris
        timezone: "Europe/Paris",
        targetHour: 7,
        quietStart: 22,
        quietEnd: 7,
      });
      expect(slot.localHour).toBe(7);
      expect(slot.localDate).toBe("2026-04-20");
    });
  });
});
