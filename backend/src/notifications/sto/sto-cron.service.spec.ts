import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { SupabaseService } from "../../supabase/supabase.service.js";
import { StoService } from "./sto.service.js";
import { StoCronService } from "./sto-cron.service.js";

interface ProfileRow {
  id: string;
  timezone: string | null;
}

describe("StoCronService", () => {
  let service: StoCronService;
  let profiles: ProfileRow[];
  let computeActiveHour: jest.Mock;

  function buildSupabase(): SupabaseService {
    return {
      getAdminClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              not: async () => Promise.resolve({ data: profiles, error: null }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseService;
  }

  beforeEach(async () => {
    profiles = [];
    computeActiveHour = jest.fn().mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoCronService,
        { provide: SupabaseService, useValue: buildSupabase() },
        {
          provide: StoService,
          useValue: { computeActiveHour },
        },
      ],
    }).compile();

    service = module.get(StoCronService);
  });

  it("invokes computeActiveHour when the user's local time is 02:00-02:14", async () => {
    profiles = [{ id: "user-a", timezone: "Europe/Paris" }];
    // 2026-04-20T00:05Z → 02:05 Paris (summer CEST = UTC+2).
    const now = new Date("2026-04-20T00:05:00Z");

    await service.tickForLocalTime(now);

    expect(computeActiveHour).toHaveBeenCalledWith("user-a");
  });

  it("skips users whose local time is outside the 02:00-02:14 window", async () => {
    profiles = [{ id: "user-b", timezone: "Europe/Paris" }];
    // 2026-04-20T12:00Z → 14:00 Paris, outside window.
    const now = new Date("2026-04-20T12:00:00Z");

    await service.tickForLocalTime(now);

    expect(computeActiveHour).not.toHaveBeenCalled();
  });
});
