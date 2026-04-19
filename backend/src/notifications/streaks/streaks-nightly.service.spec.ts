import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { SupabaseService } from "../../supabase/supabase.service.js";
import { GateService } from "../gate/gate.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import {
  NOTIFICATION_KIND,
  NOTIFICATION_TIER,
} from "../outbox/outbox.types.js";
import { StreaksNightlyService } from "./streaks-nightly.service.js";

const USER_ID = "user-uuid";
const GOAL_ID = "goal-uuid";
const STREAK_ID = "streak-uuid";

interface StreakRow {
  id: string;
  user_id: string;
  goal_id: string;
  current_weeks: number;
  longest_weeks: number;
  last_extended_week: string | null;
  freeze_tokens: number;
  freezes_last_granted_at: string | null;
}

interface UserCandidate {
  user_id: string;
  timezone: string;
  coach_id: number | null;
  language: string;
  tenure_start_date: string | null;
}

interface Mocks {
  candidate: UserCandidate;
  streak: StreakRow;
  gateAllowed: boolean;
  updates: Partial<StreakRow>[];
}

function defaultMocks(): Mocks {
  return {
    candidate: {
      user_id: USER_ID,
      timezone: "UTC",
      coach_id: null,
      language: "en",
      tenure_start_date: "2026-01-01",
    },
    streak: {
      id: STREAK_ID,
      user_id: USER_ID,
      goal_id: GOAL_ID,
      current_weeks: 3,
      longest_weeks: 5,
      last_extended_week: "2026-04-06",
      freeze_tokens: 0,
      freezes_last_granted_at: null,
    },
    gateAllowed: true,
    updates: [],
  };
}

function buildSupabase(mocks: Mocks): { from: jest.Mock; rpc: jest.Mock } {
  const rpc = jest.fn().mockImplementation(async (name: string) => {
    if (name === "streak_user_candidates") {
      return Promise.resolve({ data: [mocks.candidate], error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });
  const streakSelect = {
    select: jest.fn().mockReturnThis(),
    eq: jest
      .fn()
      .mockImplementation(async () =>
        Promise.resolve({ data: [mocks.streak], error: null }),
      ),
  };
  const streakUpdate = {
    update: jest.fn().mockImplementation((patch: Partial<StreakRow>) => {
      mocks.updates.push(patch);
      return streakUpdate;
    }),
    eq: jest
      .fn()
      .mockImplementation(async () => Promise.resolve({ error: null })),
  };
  let userStreaksCallCount = 0;
  const from = jest.fn((table: string) => {
    if (table === "user_streaks") {
      userStreaksCallCount += 1;
      return userStreaksCallCount === 1 ? streakSelect : streakUpdate;
    }
    throw new Error(`unexpected from(${table})`);
  });
  return { from, rpc };
}

describe("StreaksNightlyService", () => {
  let service: StreaksNightlyService;
  let outboxInsert: jest.Mock;
  let gateIsPushAllowed: jest.Mock;
  let mocks: Mocks;

  async function buildModule(): Promise<void> {
    const supabase = buildSupabase(mocks);
    outboxInsert = jest
      .fn()
      .mockResolvedValue({ status: "inserted", jobId: "job-1" });
    gateIsPushAllowed = jest.fn().mockImplementation(async () =>
      Promise.resolve({
        allowed: mocks.gateAllowed,
        reason: mocks.gateAllowed ? undefined : "user_disabled",
        timezone: "UTC",
        quietStart: 22,
        quietEnd: 7,
      }),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreaksNightlyService,
        { provide: OutboxService, useValue: { insert: outboxInsert } },
        {
          provide: GateService,
          useValue: { isPushAllowed: gateIsPushAllowed },
        },
        {
          provide: SupabaseService,
          useValue: { getAdminClient: () => supabase },
        },
      ],
    }).compile();
    service = module.get<StreaksNightlyService>(StreaksNightlyService);
  }

  beforeEach(async () => {
    mocks = defaultMocks();
    await buildModule();
  });

  it("marks streak broken and enqueues streak_broken at Sunday 23:00 local when no freeze tokens", async () => {
    // 2026-04-19 is a Sunday UTC; 23:00 UTC in UTC tz → Sunday 23:00 local.
    await service.tick(new Date("2026-04-19T23:05:00Z"));
    expect(outboxInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: NOTIFICATION_KIND.STREAK_BROKEN,
        tier: NOTIFICATION_TIER.P1,
      }),
    );
  });

  it("evaluates gate against the Monday 08:00 scheduled slot, not the Sunday 23:00 sweep time", async () => {
    // Users with default quiet hours (22-07) are inside quiet hours at Sunday
    // 23:00 but outside at Monday 08:00. The gate must be called with the
    // scheduled delivery time so the push is not silently dropped.
    await service.tick(new Date("2026-04-19T23:05:00Z"));
    expect(gateIsPushAllowed).toHaveBeenCalledWith(
      USER_ID,
      NOTIFICATION_KIND.STREAK_BROKEN,
      expect.any(Date),
    );
    const call = gateIsPushAllowed.mock.calls[0] as [string, string, Date];
    const scheduled = call[2];
    expect(scheduled.toISOString()).toBe("2026-04-20T08:00:00.000Z");
  });

  it("consumes a freeze token instead of breaking the streak when freeze_tokens > 0", async () => {
    mocks.streak.freeze_tokens = 1;
    await buildModule();
    await service.tick(new Date("2026-04-19T23:05:00Z"));
    expect(outboxInsert).not.toHaveBeenCalled();
  });

  it("does nothing when the streak has already been extended this local week", async () => {
    mocks.streak.last_extended_week = "2026-04-13";
    await buildModule();
    await service.tick(new Date("2026-04-19T23:05:00Z"));
    expect(outboxInsert).not.toHaveBeenCalled();
  });

  it("sets suppress_streak_copy=true in payload when tenure is under 60 days", async () => {
    const recent = new Date(Date.now() - 10 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    mocks.candidate.tenure_start_date = recent;
    await buildModule();
    await service.tick(new Date("2026-04-19T23:05:00Z"));
    const call = outboxInsert.mock.calls[0] as [
      { payload: { kind_specific: { suppress_streak_copy: boolean } } },
    ];
    expect(call[0].payload.kind_specific.suppress_streak_copy).toBe(true);
  });
});
