import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { SupabaseService } from "../../supabase/supabase.service.js";
import { StoService } from "./sto.service.js";

interface StatsFixture {
  distinctDays: number;
  hourDistribution: Record<string, number>;
}

interface ProfileFixture {
  coach_id: number | null;
  sto_active_hour: number | null;
  sto_active_hour_updated_at: string | null;
}

interface UpdateCall {
  sto_active_hour: number;
  sto_active_hour_updated_at: string;
}

function histogram(
  entries: ReadonlyArray<readonly [number, number]>,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [hour, count] of entries) {
    result[String(hour)] = count;
  }
  return result;
}

describe("StoService", () => {
  let service: StoService;
  let stats: StatsFixture | null;
  let profile: ProfileFixture | null;
  let rpcArgs: { p_user_id: string } | null;
  let updates: UpdateCall[];

  function buildSupabase(): SupabaseService {
    const update = (
      patch: UpdateCall,
    ): { eq: () => Promise<{ error: null }> } => {
      updates.push(patch);
      return { eq: async () => Promise.resolve({ error: null }) };
    };
    return {
      getAdminClient: () => ({
        rpc: async (_fn: string, args: { p_user_id: string }) => {
          rpcArgs = args;
          return Promise.resolve({
            data:
              stats === null
                ? []
                : [
                    {
                      distinct_days: stats.distinctDays,
                      hour_distribution: stats.hourDistribution,
                    },
                  ],
            error: null,
          });
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () =>
                Promise.resolve({ data: profile, error: null }),
            }),
          }),
          update: (patch: UpdateCall) => update(patch),
        }),
      }),
    } as unknown as SupabaseService;
  }

  beforeEach(async () => {
    stats = null;
    profile = {
      coach_id: 1,
      sto_active_hour: null,
      sto_active_hour_updated_at: null,
    };
    rpcArgs = null;
    updates = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoService,
        { provide: SupabaseService, useValue: buildSupabase() },
      ],
    }).compile();

    service = module.get(StoService);
  });

  describe("computeActiveHour", () => {
    it("returns null when distinct_days < 7", async () => {
      stats = { distinctDays: 6, hourDistribution: histogram([[20, 18]]) };

      const result = await service.computeActiveHour("user-1");

      expect(result).toBeNull();
    });

    it("returns the dominant hour when ≥7 days of data exist", async () => {
      stats = {
        distinctDays: 14,
        hourDistribution: histogram([
          [8, 2],
          [20, 35],
          [12, 4],
        ]),
      };

      const result = await service.computeActiveHour("user-1");

      expect(result).toBe(20);
    });

    it("writes the new hour when no stored value exists", async () => {
      stats = { distinctDays: 10, hourDistribution: histogram([[20, 20]]) };
      profile = {
        coach_id: 1,
        sto_active_hour: null,
        sto_active_hour_updated_at: null,
      };

      await service.computeActiveHour("user-1");

      expect(updates[0]?.sto_active_hour).toBe(20);
    });

    it("passes the user id through to the stats RPC", async () => {
      stats = { distinctDays: 8, hourDistribution: histogram([[19, 10]]) };

      await service.computeActiveHour("user-42");

      expect(rpcArgs).toEqual({ p_user_id: "user-42" });
    });
  });

  describe("evaluateWhiplash", () => {
    const now = new Date("2026-04-19T00:00:00Z");

    it("updates when no stored hour exists", () => {
      const decision = service.evaluateWhiplash(19, null, null, now);

      expect(decision.shouldUpdate).toBe(true);
    });

    it("keeps the stored hour when the new value is within 1h and recent", () => {
      const recent = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const decision = service.evaluateWhiplash(
        19,
        20,
        recent.toISOString(),
        now,
      );

      expect(decision.shouldUpdate).toBe(false);
    });

    it("updates when the new hour differs by ≥2h", () => {
      const recent = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const decision = service.evaluateWhiplash(
        17,
        20,
        recent.toISOString(),
        now,
      );

      expect(decision.shouldUpdate).toBe(true);
    });

    it("updates when the stored hour is older than 14 days regardless of delta", () => {
      const stale = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

      const decision = service.evaluateWhiplash(
        20,
        20,
        stale.toISOString(),
        now,
      );

      expect(decision.shouldUpdate).toBe(true);
    });
  });

  describe("getEffectiveTargetHour", () => {
    it("returns the stored STO hour for daily_check_in when present", async () => {
      profile = {
        coach_id: 1,
        sto_active_hour: 9,
        sto_active_hour_updated_at: "2026-04-01T00:00:00Z",
      };

      const hour = await service.getEffectiveTargetHour("u", "daily_check_in");

      expect(hour).toBe(9);
    });

    it("falls back to the persona-default hour when sto_active_hour is null", async () => {
      profile = {
        coach_id: 1,
        sto_active_hour: null,
        sto_active_hour_updated_at: null,
      };

      const hour = await service.getEffectiveTargetHour("u", "daily_check_in");

      expect(hour).toBe(19);
    });

    it("clamps streak_at_risk to the 18:00 floor when STO is earlier", async () => {
      profile = {
        coach_id: 1,
        sto_active_hour: 10,
        sto_active_hour_updated_at: "2026-04-01T00:00:00Z",
      };

      const hour = await service.getEffectiveTargetHour("u", "streak_at_risk");

      expect(hour).toBe(18);
    });
  });
});
