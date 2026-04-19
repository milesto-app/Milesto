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
import type { MilestoneCompletedEvent } from "./milestone-celebration.producer.js";
import { MilestoneCelebrationProducer } from "./milestone-celebration.producer.js";

const USER_ID = "user-uuid";
const GOAL_ID = "goal-uuid";
const MILESTONE_ID = "milestone-uuid";
const COMPLETED_AT_UTC = "2026-04-01T10:00:00.000Z";

type ProfileRow = { coach_id: number | null; language: string | null };

function buildEvent(): MilestoneCompletedEvent {
  return {
    userId: USER_ID,
    milestoneId: MILESTONE_ID,
    goalId: GOAL_ID,
    completedAt: COMPLETED_AT_UTC,
  };
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

describe("MilestoneCelebrationProducer", () => {
  let producer: MilestoneCelebrationProducer;
  let outboxInsert: jest.Mock;
  let gateIsPushAllowed: jest.Mock;
  let profile: ProfileRow;

  beforeEach(async () => {
    profile = { coach_id: 1, language: "en" };
    outboxInsert = jest
      .fn()
      .mockResolvedValue({ status: "inserted", jobId: "job-1" });
    gateIsPushAllowed = jest.fn().mockResolvedValue({
      allowed: true,
      timezone: "UTC",
      quietStart: 22,
      quietEnd: 7,
    });
    const { from } = createFromMock(profile);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneCelebrationProducer,
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

    producer = module.get<MilestoneCelebrationProducer>(
      MilestoneCelebrationProducer,
    );
  });

  it("uses kind=milestone_hit, tier=P2, and the milestone_hit dedup key", async () => {
    await producer.handle(buildEvent());

    expect(outboxInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: NOTIFICATION_KIND.MILESTONE_HIT,
        tier: NOTIFICATION_TIER.P2,
        dedupKey: `milestone_hit:${MILESTONE_ID}`,
      }),
    );
  });

  it("builds the §4.6 payload with milestone deeplink and en copy", async () => {
    await producer.handle(buildEvent());

    const call = outboxInsert.mock.calls[0] as [
      { payload: Record<string, unknown> },
    ];
    expect(call[0].payload).toEqual(
      expect.objectContaining({
        title: "Milestone unlocked!",
        cta_deeplink: `momentum://milestone/${MILESTONE_ID}`,
        coach: { id: 1, persona: "standard" },
        kind_specific: {
          milestone_id: MILESTONE_ID,
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
    expect(call[0].payload.title).toBe("Étape franchie !");
  });

  it("does not enqueue when the gate denies the push", async () => {
    gateIsPushAllowed.mockResolvedValueOnce({
      allowed: false,
      reason: "user_disabled",
      timezone: null,
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
});
