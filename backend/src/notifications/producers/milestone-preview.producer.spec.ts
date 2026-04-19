import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { SupabaseService } from "../../supabase/supabase.service.js";
import { GateService } from "../gate/gate.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import {
  NOTIFICATION_KIND,
  NOTIFICATION_TIER,
} from "../outbox/outbox.types.js";
import type { MilestoneCompletedPayload } from "./milestone-preview.producer.js";
import { MilestonePreviewProducer } from "./milestone-preview.producer.js";

const USER_ID = "user-uuid";
const GOAL_ID = "goal-uuid";
const COMPLETED_MILESTONE_ID = "milestone-completed-uuid";
const NEXT_MILESTONE_ID = "milestone-next-uuid";

const COMPLETED_AT_UTC = "2026-04-01T10:00:00.000Z";
const MS_PER_HOUR = 3_600_000;

type CompletedRow = { goal_id: string; target_week: number } | null;
type NextRow = {
  id: string;
  title: string;
  target_week: number;
  target_date: string | null;
  completed_at: string | null;
};
type ProfileRow = {
  coach_id: number | null;
  language: string | null;
  timezone: string | null;
};

interface MockState {
  completed: CompletedRow;
  nextList: NextRow[];
  profile: ProfileRow;
  prepCount: number;
}

function buildDefaultState(): MockState {
  return {
    completed: { goal_id: GOAL_ID, target_week: 4 },
    nextList: [
      {
        id: NEXT_MILESTONE_ID,
        title: "Ship the MVP",
        target_week: 8,
        target_date: "2026-06-01",
        completed_at: null,
      },
    ],
    profile: { coach_id: 1, language: "en", timezone: "UTC" },
    prepCount: 0,
  };
}

function createFromMock(state: MockState): {
  from: jest.Mock;
} {
  const milestonesSingle = jest
    .fn()
    .mockImplementation(async () =>
      Promise.resolve({ data: state.completed, error: null }),
    );
  const milestonesLimit = jest
    .fn()
    .mockImplementation(async () =>
      Promise.resolve({ data: state.nextList, error: null }),
    );
  const milestonesCompletedQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: milestonesSingle,
  };
  const milestonesNextQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: milestonesLimit,
  };
  let milestonesCallCount = 0;
  const profilesQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest
      .fn()
      .mockImplementation(async () =>
        Promise.resolve({ data: state.profile, error: null }),
      ),
  };
  const weeklyTasksQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest
      .fn()
      .mockImplementation(async () =>
        Promise.resolve({ count: state.prepCount, error: null }),
      ),
  };
  const from = jest.fn((table: string) => {
    if (table === "milestones") {
      milestonesCallCount += 1;
      return milestonesCallCount === 1
        ? milestonesCompletedQuery
        : milestonesNextQuery;
    }
    if (table === "profiles") {
      return profilesQuery;
    }
    if (table === "weekly_tasks") {
      return weeklyTasksQuery;
    }
    throw new Error(`unexpected from(${table})`);
  });
  return { from };
}

function buildEvent(): MilestoneCompletedPayload {
  return {
    userId: USER_ID,
    milestoneId: COMPLETED_MILESTONE_ID,
    goalId: GOAL_ID,
    completedAt: COMPLETED_AT_UTC,
  };
}

describe("MilestonePreviewProducer", () => {
  let producer: MilestonePreviewProducer;
  let outboxInsert: jest.Mock;
  let state: MockState;

  beforeEach(async () => {
    state = buildDefaultState();
    outboxInsert = jest
      .fn()
      .mockResolvedValue({ status: "inserted", jobId: "job-1" });
    const { from } = createFromMock(state);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestonePreviewProducer,
        {
          provide: OutboxService,
          useValue: { insert: outboxInsert },
        },
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: () => ({ from }),
          },
        },
        {
          provide: GateService,
          useValue: {
            isPushAllowed: jest.fn().mockResolvedValue({ allowed: true }),
          },
        },
      ],
    }).compile();

    producer = module.get<MilestonePreviewProducer>(MilestonePreviewProducer);
  });

  it("inserts an outbox job with the milestone_preview dedup key on happy path", async () => {
    await producer.handle(buildEvent());

    expect(outboxInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupKey: `milestone_preview:${COMPLETED_MILESTONE_ID}`,
      }),
    );
  });

  it("uses kind=milestone_preview and tier=P2", async () => {
    await producer.handle(buildEvent());

    expect(outboxInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: NOTIFICATION_KIND.MILESTONE_PREVIEW,
        tier: NOTIFICATION_TIER.P2,
      }),
    );
  });

  it("builds the §4.6 payload with kind_specific fields populated from the next milestone", async () => {
    await producer.handle(buildEvent());

    const call = outboxInsert.mock.calls[0] as [
      { payload: Record<string, unknown> },
    ];
    expect(call[0].payload).toEqual(
      expect.objectContaining({
        title: "The Motivator",
        teaser: "Next up: Ship the MVP",
        cta_deeplink: `momentum://goal/${GOAL_ID}`,
        coach: { id: 1, persona: "standard" },
        kind_specific: {
          next_milestone_id: NEXT_MILESTONE_ID,
          next_milestone_name: "Ship the MVP",
          weeks_available: 4,
          any_prep_already_done: false,
        },
        memory_hooks: {},
      }),
    );
  });

  it("schedules the push 24h after completedAt when the slot is outside quiet hours", async () => {
    await producer.handle(buildEvent());

    const call = outboxInsert.mock.calls[0] as [{ scheduledForUtc: Date }];
    const expectedMs = new Date(COMPLETED_AT_UTC).getTime() + 24 * MS_PER_HOUR;
    expect(call[0].scheduledForUtc.getTime()).toBe(expectedMs);
  });

  it("shifts the push to 08:00 local next day when the +24h slot falls inside quiet hours", async () => {
    state.profile = { coach_id: 1, language: "en", timezone: "Europe/Paris" };
    // +24h from 2026-04-01T23:30Z → 2026-04-02T23:30Z → local Paris 2026-04-03 01:30 (quiet)
    const event: MilestoneCompletedPayload = {
      ...buildEvent(),
      completedAt: "2026-04-01T23:30:00.000Z",
    };

    await producer.handle(event);

    const call = outboxInsert.mock.calls[0] as [{ scheduledForUtc: Date }];
    // Expect 2026-04-03 08:00 Europe/Paris (DST summer = UTC+2) = 06:00 UTC
    expect(call[0].scheduledForUtc.toISOString()).toBe(
      "2026-04-03T06:00:00.000Z",
    );
  });

  it("skips when the goal has no uncompleted next milestone", async () => {
    state.nextList = [];

    await producer.handle(buildEvent());

    expect(outboxInsert).not.toHaveBeenCalled();
  });

  it("sets any_prep_already_done=true when weekly_tasks exist for the next milestone", async () => {
    state.prepCount = 3;

    await producer.handle(buildEvent());

    const call = outboxInsert.mock.calls[0] as [
      { payload: { kind_specific: { any_prep_already_done: boolean } } },
    ];
    expect(call[0].payload.kind_specific.any_prep_already_done).toBe(true);
  });

  it("swallows outbox errors so upstream emitters are not affected", async () => {
    outboxInsert.mockRejectedValueOnce(new Error("db down"));

    await expect(producer.handle(buildEvent())).resolves.toBeUndefined();
  });

  it("treats a duplicate outbox insert as a successful no-op", async () => {
    outboxInsert.mockResolvedValueOnce({ status: "duplicate" });

    await producer.handle(buildEvent());

    expect(outboxInsert).toHaveBeenCalledTimes(1);
  });
});
