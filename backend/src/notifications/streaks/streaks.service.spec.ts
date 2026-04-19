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
import { StreaksService } from "./streaks.service.js";

const USER_ID = "user-uuid";
const GOAL_ID = "goal-uuid";
const STREAK_ID = "streak-uuid";

interface StreakState {
  id: string;
  current_weeks: number;
  longest_weeks: number;
  last_extended_week: string | null;
  freeze_tokens: number;
}

interface ProfileRow {
  timezone: string | null;
  tenure_start_date: string | null;
}

interface MockState {
  profile: ProfileRow;
  streak: StreakState | null;
  gateAllowed: boolean;
}

function defaultState(): MockState {
  return {
    profile: { timezone: "UTC", tenure_start_date: "2026-01-01" },
    streak: {
      id: STREAK_ID,
      current_weeks: 0,
      longest_weeks: 0,
      last_extended_week: null,
      freeze_tokens: 1,
    },
    gateAllowed: true,
  };
}

function makeThenable<T>(result: T): {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  eq: jest.Mock;
  maybeSingle: jest.Mock;
  single: jest.Mock;
  __result: T;
} {
  const builder: {
    select: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    eq: jest.Mock;
    maybeSingle: jest.Mock;
    single: jest.Mock;
    __result: T;
  } = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn(),
    single: jest.fn(),
    __result: result,
  };
  builder.select.mockReturnValue(builder);
  builder.insert.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.maybeSingle.mockImplementation(async () => Promise.resolve(result));
  builder.single.mockImplementation(async () => Promise.resolve(result));
  return builder;
}

function buildSupabase(state: MockState): {
  from: jest.Mock;
  updates: Partial<StreakState>[];
} {
  const updates: Partial<StreakState>[] = [];
  const profilesBuilder = makeThenable({
    data: state.profile,
    error: null,
  });
  // Selects return streak, inserts return a fresh streak, updates terminate with { error: null }.
  const from = jest.fn((table: string) => {
    if (table === "profiles") {
      return profilesBuilder;
    }
    if (table === "user_streaks") {
      const builder: {
        select: jest.Mock;
        insert: jest.Mock;
        update: jest.Mock;
        eq: jest.Mock;
        maybeSingle: jest.Mock;
        single: jest.Mock;
      } = {
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        eq: jest.fn(),
        maybeSingle: jest.fn(),
        single: jest.fn(),
      };
      let operation: "select" | "insert" | "update" = "select";
      builder.select.mockImplementation(() => {
        operation = operation === "insert" ? "insert" : "select";
        return builder;
      });
      builder.insert.mockImplementation(() => {
        operation = "insert";
        return builder;
      });
      builder.update.mockImplementation((patch: Partial<StreakState>) => {
        operation = "update";
        updates.push(patch);
        return builder;
      });
      // In update mode the terminal .eq returns a thenable with { error: null }.
      // In select mode .eq must return the builder itself for further chaining.
      const updateTerminal: PromiseLike<{ error: null }> = {
        async then(onfulfilled?, onrejected?) {
          return Promise.resolve({ error: null }).then(onfulfilled, onrejected);
        },
      };
      builder.eq.mockImplementation(() =>
        operation === "update" ? updateTerminal : builder,
      );
      builder.maybeSingle.mockImplementation(async () =>
        Promise.resolve({ data: state.streak, error: null }),
      );
      builder.single.mockImplementation(async () =>
        Promise.resolve({
          data: {
            id: STREAK_ID,
            current_weeks: 0,
            longest_weeks: 0,
            last_extended_week: null,
            freeze_tokens: 1,
          },
          error: null,
        }),
      );
      return builder;
    }
    throw new Error(`unexpected from(${table})`);
  });
  return { from, updates };
}

describe("StreaksService", () => {
  let service: StreaksService;
  let outboxInsert: jest.Mock;
  let gateIsPushAllowed: jest.Mock;
  let state: MockState;
  let updates: Partial<StreakState>[];

  async function buildModule(): Promise<void> {
    const supa = buildSupabase(state);
    updates = supa.updates;
    outboxInsert = jest
      .fn()
      .mockResolvedValue({ status: "inserted", jobId: "job-1" });
    gateIsPushAllowed = jest.fn().mockImplementation(async () =>
      Promise.resolve({
        allowed: state.gateAllowed,
        reason: state.gateAllowed ? undefined : "user_disabled",
        timezone: "UTC",
        quietStart: 22,
        quietEnd: 7,
      }),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreaksService,
        { provide: OutboxService, useValue: { insert: outboxInsert } },
        {
          provide: GateService,
          useValue: { isPushAllowed: gateIsPushAllowed },
        },
        {
          provide: SupabaseService,
          useValue: { getAdminClient: () => ({ from: supa.from }) },
        },
        {
          provide: PostCommitCopyGenRunner,
          useValue: { runIfShortFuse: jest.fn() },
        },
      ],
    }).compile();
    service = module.get<StreaksService>(StreaksService);
  }

  beforeEach(async () => {
    state = defaultState();
    await buildModule();
  });

  it("sets current_weeks=1 on first task completion when no prior extension", async () => {
    await service.evaluateOnTaskCompleted(
      USER_ID,
      GOAL_ID,
      new Date("2026-04-15T12:00:00Z"),
    );
    expect(updates[0]?.current_weeks).toBe(1);
  });

  it("increments current_weeks when last_extended_week is the previous local week", async () => {
    state.streak = {
      id: STREAK_ID,
      current_weeks: 3,
      longest_weeks: 5,
      last_extended_week: "2026-04-06",
      freeze_tokens: 0,
    };
    await buildModule();
    await service.evaluateOnTaskCompleted(
      USER_ID,
      GOAL_ID,
      new Date("2026-04-15T12:00:00Z"),
    );
    expect(updates[0]?.current_weeks).toBe(4);
  });

  it("is a no-op when the streak was already extended this local week", async () => {
    state.streak = {
      id: STREAK_ID,
      current_weeks: 2,
      longest_weeks: 2,
      last_extended_week: "2026-04-13",
      freeze_tokens: 0,
    };
    await buildModule();
    await service.evaluateOnTaskCompleted(
      USER_ID,
      GOAL_ID,
      new Date("2026-04-15T12:00:00Z"),
    );
    expect(updates).toHaveLength(0);
  });

  it("enqueues streak_milestone at 4-week boundary with tier P2 and dedup key including weeks", async () => {
    state.streak = {
      id: STREAK_ID,
      current_weeks: 3,
      longest_weeks: 5,
      last_extended_week: "2026-04-06",
      freeze_tokens: 0,
    };
    await buildModule();
    await service.evaluateOnTaskCompleted(
      USER_ID,
      GOAL_ID,
      new Date("2026-04-15T12:00:00Z"),
    );
    expect(outboxInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: NOTIFICATION_KIND.STREAK_MILESTONE,
        tier: NOTIFICATION_TIER.P2,
        dedupKey: `streak_milestone:${USER_ID}:${GOAL_ID}:4`,
      }),
    );
  });

  it("does not enqueue a milestone job when the gate denies the push", async () => {
    state.streak = {
      id: STREAK_ID,
      current_weeks: 3,
      longest_weeks: 5,
      last_extended_week: "2026-04-06",
      freeze_tokens: 0,
    };
    state.gateAllowed = false;
    await buildModule();
    await service.evaluateOnTaskCompleted(
      USER_ID,
      GOAL_ID,
      new Date("2026-04-15T12:00:00Z"),
    );
    expect(outboxInsert).not.toHaveBeenCalled();
  });

  it("sets suppress_streak_copy=true when tenure is under 60 days", async () => {
    state.streak = {
      id: STREAK_ID,
      current_weeks: 3,
      longest_weeks: 5,
      last_extended_week: "2026-04-06",
      freeze_tokens: 0,
    };
    const recent = new Date(Date.now() - 10 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    state.profile = { timezone: "UTC", tenure_start_date: recent };
    await buildModule();
    await service.evaluateOnTaskCompleted(
      USER_ID,
      GOAL_ID,
      new Date("2026-04-15T12:00:00Z"),
    );
    const call = outboxInsert.mock.calls[0] as [
      { payload: { kind_specific: { suppress_streak_copy: boolean } } },
    ];
    expect(call[0].payload.kind_specific.suppress_streak_copy).toBe(true);
  });
});
