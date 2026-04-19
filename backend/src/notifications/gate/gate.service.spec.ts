import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { SupabaseService } from "../../supabase/supabase.service.js";
import { NOTIFICATION_KIND } from "../outbox/outbox.types.js";
import { GateService } from "./gate.service.js";

interface ProfileFixture {
  notif_enabled: boolean;
  notif_preferences: Record<string, unknown>;
  notif_quiet_start: number | null;
  notif_quiet_end: number | null;
  timezone: string | null;
}

describe("GateService", () => {
  let service: GateService;
  let profile: ProfileFixture;

  function buildSupabaseStub(): SupabaseService {
    return {
      getAdminClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () =>
                Promise.resolve({ data: profile, error: null }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseService;
  }

  beforeEach(async () => {
    profile = {
      notif_enabled: true,
      notif_preferences: {},
      notif_quiet_start: null,
      notif_quiet_end: null,
      timezone: "Europe/Paris",
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GateService,
        { provide: SupabaseService, useValue: buildSupabaseStub() },
      ],
    }).compile();
    service = module.get(GateService);
  });

  describe("isPushAllowed", () => {
    it("should deny with user_disabled when notif_enabled is false", async () => {
      profile.notif_enabled = false;
      const decision = await service.isPushAllowed(
        "u1",
        NOTIFICATION_KIND.DAILY_CHECK_IN,
        new Date("2026-04-20T12:00:00Z"),
      );
      expect(decision).toMatchObject({
        allowed: false,
        reason: "user_disabled",
      });
    });

    it("should deny with global_paused when global.paused_until is in the future", async () => {
      profile.notif_preferences = {
        global: { paused_until: "2026-05-01T00:00:00Z" },
      };
      const decision = await service.isPushAllowed(
        "u1",
        NOTIFICATION_KIND.DAILY_CHECK_IN,
        new Date("2026-04-20T12:00:00Z"),
      );
      expect(decision).toMatchObject({
        allowed: false,
        reason: "global_paused",
      });
    });

    it("should deny with kind_disabled when kind.enabled is false", async () => {
      profile.notif_preferences = {
        daily_check_in: { enabled: false },
      };
      const decision = await service.isPushAllowed(
        "u1",
        NOTIFICATION_KIND.DAILY_CHECK_IN,
        new Date("2026-04-20T12:00:00Z"),
      );
      expect(decision).toMatchObject({
        allowed: false,
        reason: "kind_disabled",
      });
    });

    it("should deny with kind_paused when kind paused_until is in the future", async () => {
      profile.notif_preferences = {
        daily_check_in: { paused_until: "2026-05-01T00:00:00Z" },
      };
      const decision = await service.isPushAllowed(
        "u1",
        NOTIFICATION_KIND.DAILY_CHECK_IN,
        new Date("2026-04-20T12:00:00Z"),
      );
      expect(decision).toMatchObject({
        allowed: false,
        reason: "kind_paused",
      });
    });

    it("should deny with quiet_hours when evaluation time is inside the window", async () => {
      profile.notif_quiet_start = 22;
      profile.notif_quiet_end = 7;
      // 02:00 UTC = 04:00 Paris, inside 22-07 quiet window.
      const decision = await service.isPushAllowed(
        "u1",
        NOTIFICATION_KIND.DAILY_CHECK_IN,
        new Date("2026-04-20T02:00:00Z"),
      );
      expect(decision).toMatchObject({
        allowed: false,
        reason: "quiet_hours",
      });
    });

    it("should allow coach_reply_ready even during quiet hours", async () => {
      profile.notif_quiet_start = 22;
      profile.notif_quiet_end = 7;
      const decision = await service.isPushAllowed(
        "u1",
        NOTIFICATION_KIND.COACH_REPLY_READY,
        new Date("2026-04-20T02:00:00Z"),
      );
      expect(decision.allowed).toBe(true);
    });

    it("should apply default 22-07 quiet window when columns are null", async () => {
      // 04:00 Paris local → default quiet hours blocks it.
      const decision = await service.isPushAllowed(
        "u1",
        NOTIFICATION_KIND.DAILY_CHECK_IN,
        new Date("2026-04-20T02:00:00Z"),
      );
      expect(decision).toMatchObject({
        allowed: false,
        reason: "quiet_hours",
      });
    });

    it("should allow when all gates pass", async () => {
      // 10:00 UTC → 12:00 Paris → outside default quiet hours.
      const decision = await service.isPushAllowed(
        "u1",
        NOTIFICATION_KIND.DAILY_CHECK_IN,
        new Date("2026-04-20T10:00:00Z"),
      );
      expect(decision.allowed).toBe(true);
    });

    it("should evaluate quiet hours against a future evaluationTime", async () => {
      // Now (not used): noon. evaluationTime: 2026-04-21T02:00Z → 04:00 Paris, quiet.
      const decision = await service.isPushAllowed(
        "u1",
        NOTIFICATION_KIND.DAILY_CHECK_IN,
        new Date("2026-04-21T02:00:00Z"),
      );
      expect(decision).toMatchObject({
        allowed: false,
        reason: "quiet_hours",
      });
    });

    it("should deny with no_timezone when profile.timezone is null", async () => {
      profile.timezone = null;
      const decision = await service.isPushAllowed(
        "u1",
        NOTIFICATION_KIND.DAILY_CHECK_IN,
        new Date("2026-04-20T10:00:00Z"),
      );
      expect(decision).toMatchObject({
        allowed: false,
        reason: "no_timezone",
      });
    });
  });
});
