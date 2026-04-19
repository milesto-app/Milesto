import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { SupabaseService } from "../../supabase/supabase.service.js";
import { GateService } from "../gate/gate.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import { StoService } from "../sto/sto.service.js";
import { StoCronService } from "../sto/sto-cron.service.js";
import { SchedulerService } from "./scheduler.service.js";

interface Candidate {
  user_id: string;
  timezone: string;
  coach_id: number | null;
  language: string;
}

describe("SchedulerService", () => {
  let service: SchedulerService;
  let candidates: Candidate[];
  let insert: jest.Mock;
  let gateDecision: { allowed: boolean };
  let getEffectiveTargetHour: jest.Mock;

  function buildSupabase(): SupabaseService {
    return {
      getAdminClient: () => ({
        rpc: async () => Promise.resolve({ data: candidates, error: null }),
      }),
    } as unknown as SupabaseService;
  }

  function buildStoCron(): StoCronService {
    return {
      tickForLocalTime: jest.fn().mockResolvedValue(undefined),
    } as unknown as StoCronService;
  }

  beforeEach(async () => {
    candidates = [
      {
        user_id: "user-1",
        timezone: "Europe/Paris",
        coach_id: 1,
        language: "en",
      },
    ];
    insert = jest.fn().mockResolvedValue({ status: "inserted", jobId: "j1" });
    gateDecision = { allowed: true };
    getEffectiveTargetHour = jest.fn().mockResolvedValue(19);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: SupabaseService, useValue: buildSupabase() },
        { provide: OutboxService, useValue: { insert } },
        {
          provide: GateService,
          useValue: {
            isPushAllowed: async () => Promise.resolve(gateDecision),
          },
        },
        {
          provide: StoService,
          useValue: { getEffectiveTargetHour },
        },
        { provide: StoCronService, useValue: buildStoCron() },
      ],
    }).compile();

    service = module.get(SchedulerService);
  });

  it("asks StoService for the daily_check_in target hour", async () => {
    await service.tick();

    expect(getEffectiveTargetHour).toHaveBeenCalledWith(
      "user-1",
      "daily_check_in",
    );
  });

  it("uses the STO-provided hour when the scheduler enqueues a daily_check_in", async () => {
    getEffectiveTargetHour.mockResolvedValueOnce(20);

    await service.tick();

    const call = insert.mock.calls[0] as [
      { payload: { kind_specific: { target_local_hour: number } } },
    ];
    expect(call[0].payload.kind_specific.target_local_hour).toBe(20);
  });
});
