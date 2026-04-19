import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { SupabaseService } from "../../supabase/supabase.service.js";
import { PostCommitCopyGenRunner } from "../copy/post-commit-copy-gen.runner.js";
import { GateService } from "../gate/gate.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import {
  NOTIFICATION_KIND,
  NOTIFICATION_TIER,
} from "../outbox/outbox.types.js";
import type { WeeklyPlanCompletedEvent } from "./week-celebration.producer.js";
import { WeekCelebrationProducer } from "./week-celebration.producer.js";

const USER_ID = "user-uuid";
const GOAL_ID = "goal-uuid";
const PLAN_ID = "plan-uuid";

type ProfileRow = {
  coach_id: number | null;
  language: string | null;
  tenure_start_date: string | null;
};

function buildEvent(): WeeklyPlanCompletedEvent {
  return { userId: USER_ID, goalId: GOAL_ID, planId: PLAN_ID };
}

function createFromMock(profile: ProfileRow): { from: jest.Mock } {
  const profilesQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest
      .fn()
      .mockImplementation(async () =>
        Promise.resolve({ data: profile, error: null }),
      ),
  };
  const from = jest.fn((table: string) => {
    if (table === "profiles") {
      return profilesQuery;
    }
    throw new Error(`unexpected from(${table})`);
  });
  return { from };
}

describe("WeekCelebrationProducer", () => {
  let producer: WeekCelebrationProducer;
  let outboxInsert: jest.Mock;
  let gateIsPushAllowed: jest.Mock;
  let profile: ProfileRow;

  beforeEach(async () => {
    profile = { coach_id: 1, language: "en", tenure_start_date: null };
    outboxInsert = jest
      .fn()
      .mockResolvedValue({ status: "inserted", jobId: "job-3" });
    gateIsPushAllowed = jest.fn().mockResolvedValue({
      allowed: true,
      timezone: "UTC",
      quietStart: 22,
      quietEnd: 7,
    });
    const { from } = createFromMock(profile);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeekCelebrationProducer,
        { provide: OutboxService, useValue: { insert: outboxInsert } },
        {
          provide: GateService,
          useValue: { isPushAllowed: gateIsPushAllowed },
        },
        {
          provide: SupabaseService,
          useValue: { getAdminClient: () => ({ from }) },
        },
        {
          provide: PostCommitCopyGenRunner,
          useValue: { runIfShortFuse: jest.fn() },
        },
      ],
    }).compile();

    producer = module.get<WeekCelebrationProducer>(WeekCelebrationProducer);
  });

  it("uses kind=week_completed, tier=P2, and the week_completed dedup key", async () => {
    await producer.handle(buildEvent());

    expect(outboxInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: NOTIFICATION_KIND.WEEK_COMPLETED,
        tier: NOTIFICATION_TIER.P2,
        dedupKey: `week_completed:${PLAN_ID}`,
      }),
    );
  });

  it("builds the §4.6 payload with the plan deeplink and en copy", async () => {
    await producer.handle(buildEvent());

    const call = outboxInsert.mock.calls[0] as [
      { payload: Record<string, unknown> },
    ];
    expect(call[0].payload).toEqual(
      expect.objectContaining({
        title: "Week wrapped up",
        cta_deeplink: "momentum://plan",
        coach: { id: 1, persona: "standard" },
        kind_specific: {
          weekly_plan_id: PLAN_ID,
          goal_id: GOAL_ID,
        },
        memory_hooks: {},
      }),
    );
  });

  it("uses french title copy when the user's language is fr", async () => {
    profile.language = "fr";

    await producer.handle(buildEvent());

    const call = outboxInsert.mock.calls[0] as [{ payload: { title: string } }];
    expect(call[0].payload.title).toBe("Semaine bouclée");
  });

  it("does not enqueue when the gate denies the push", async () => {
    gateIsPushAllowed.mockResolvedValueOnce({
      allowed: false,
      reason: "global_paused",
      timezone: "UTC",
      quietStart: 22,
      quietEnd: 7,
    });

    await producer.handle(buildEvent());

    expect(outboxInsert).not.toHaveBeenCalled();
  });

  it("treats a duplicate outbox insert as a successful no-op", async () => {
    outboxInsert.mockResolvedValueOnce({ status: "duplicate" });

    await producer.handle(buildEvent());

    expect(outboxInsert).toHaveBeenCalledTimes(1);
  });

  it("swallows outbox errors so upstream emitters are not affected", async () => {
    outboxInsert.mockRejectedValueOnce(new Error("db down"));

    await expect(producer.handle(buildEvent())).resolves.toBeUndefined();
  });

  it("sets copyGen.suppressStreakCopy when tenure started within the last 60 days", async () => {
    const recent = new Date(Date.now() - 10 * 86_400_000);
    profile.tenure_start_date = recent.toISOString().slice(0, 10);

    await producer.handle(buildEvent());

    const call = outboxInsert.mock.calls[0] as [
      { copyGen: { suppressStreakCopy: boolean } },
    ];
    expect(call[0].copyGen.suppressStreakCopy).toBe(true);
  });
});
