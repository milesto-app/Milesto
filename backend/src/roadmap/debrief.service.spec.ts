import { ConflictException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { SupabaseService } from "../supabase/supabase.service.js";
import { DebriefService } from "./debrief.service.js";

interface MilestoneMocks {
  planMilestoneId: string;
  planLookupError: { message: string } | null;
  siblingActiveCount: number;
  siblingCountError: { message: string } | null;
  milestoneUpdate: {
    data: { id: string } | null;
    error: { message: string } | null;
  };
}

interface SpecMocks {
  goalExists: boolean;
  hasDuplicateDebrief: boolean;
  planCompletes: boolean;
  milestone: MilestoneMocks;
}

function defaultMocks(): SpecMocks {
  return {
    goalExists: true,
    hasDuplicateDebrief: false,
    planCompletes: true,
    milestone: {
      planMilestoneId: "milestone-uuid",
      planLookupError: null,
      siblingActiveCount: 1,
      siblingCountError: null,
      milestoneUpdate: { data: { id: "milestone-uuid" }, error: null },
    },
  };
}

function buildSupabaseStub(
  mocks: SpecMocks,
  mockDebrief: Record<string, unknown>,
): { getAdminClient: jest.Mock } {
  const getAdminClient = jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === "goals") {
        return buildGoalsTable(mocks);
      }
      if (table === "debriefs") {
        return buildDebriefsTable(mocks, mockDebrief);
      }
      if (table === "weekly_plans") {
        return buildWeeklyPlansTable(mocks);
      }
      if (table === "milestones") {
        return buildMilestonesTable(mocks);
      }
      throw new Error(`unexpected table ${table}`);
    }),
  }));
  return { getAdminClient };
}

function buildGoalsTable(mocks: SpecMocks): unknown {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          is: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mocks.goalExists ? { id: "goal-uuid" } : null,
              error: mocks.goalExists ? null : { message: "not found" },
            }),
          }),
        }),
      }),
    }),
  };
}

function buildDebriefsTable(
  mocks: SpecMocks,
  mockDebrief: Record<string, unknown>,
): unknown {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: mocks.hasDuplicateDebrief ? [{ id: "existing" }] : [],
              error: null,
            }),
          }),
        }),
      }),
    }),
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockDebrief, error: null }),
      }),
    }),
  };
}

function planLookupData(m: MilestoneMocks): { milestone_id: string } | null {
  if (m.planLookupError !== null) {
    return null;
  }
  return { milestone_id: m.planMilestoneId };
}

function buildWeeklyPlansTable(mocks: SpecMocks): unknown {
  return {
    update: jest.fn().mockImplementation(() => {
      const builder: any = {
        eq: jest.fn(() => builder),
        select: jest.fn().mockResolvedValue({
          data: mocks.planCompletes ? [{ id: "plan-uuid" }] : [],
          error: null,
        }),
      };
      return builder;
    }),
    select: jest.fn().mockImplementation((_cols: string, opts?: { count?: string }) => {
      if (opts === undefined || opts.count === undefined) {
        const builder: any = {
          eq: jest.fn(() => builder),
          maybeSingle: jest.fn().mockResolvedValue({
            data: planLookupData(mocks.milestone),
            error: mocks.milestone.planLookupError,
          }),
        };
        return builder;
      }
      const builder: any = {
        eq: jest.fn(() => builder),
        neq: jest.fn().mockResolvedValue({
          count: mocks.milestone.siblingActiveCount,
          error: mocks.milestone.siblingCountError,
        }),
      };
      return builder;
    }),
  };
}

function buildMilestonesTable(mocks: SpecMocks): unknown {
  return {
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          is: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              maybeSingle: jest
                .fn()
                .mockResolvedValue(mocks.milestone.milestoneUpdate),
            }),
          }),
        }),
      }),
    }),
  };
}

describe("DebriefService", () => {
  let service: DebriefService;
  let mockSupabaseService: { getAdminClient: jest.Mock };
  let mockEventEmitter: { emit: jest.Mock };

  const userId = "user-uuid";
  const goalId = "goal-uuid";
  const dto = {
    note: "Good day",
    task_ratings: [],
    weekly_plan_id: "plan-uuid",
  };
  const mockDebrief = {
    id: "debrief-uuid",
    goal_id: goalId,
    user_id: userId,
    note: "Good day",
  };

  async function boot(mocks: SpecMocks): Promise<void> {
    mockSupabaseService = buildSupabaseStub(mocks, mockDebrief);
    mockEventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DebriefService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<DebriefService>(DebriefService);
  }

  beforeEach(async () => {
    await boot(defaultMocks());
  });

  describe("submitDebrief", () => {
    it("submits the debrief and emits debrief.submitted", async () => {
      const result = await service.submitDebrief(goalId, userId, dto);

      expect(result).toEqual(mockDebrief);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "debrief.submitted",
        expect.objectContaining({
          debriefId: mockDebrief.id,
          goalId,
          userId,
        }),
      );
    });

    it("emits weekly-plan.completed when the debrief closes out the plan", async () => {
      await service.submitDebrief(goalId, userId, dto);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "weekly-plan.completed",
        { userId, goalId, planId: dto.weekly_plan_id },
      );
    });

    it("does not emit milestone.completed while sibling plans are still active", async () => {
      await service.submitDebrief(goalId, userId, dto);

      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        "milestone.completed",
        expect.anything(),
      );
    });

    it("raises ConflictException on duplicate debrief", async () => {
      await boot({ ...defaultMocks(), hasDuplicateDebrief: true });

      await expect(service.submitDebrief(goalId, userId, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("milestone auto-completion (issue #62)", () => {
    it("flips the milestone and emits milestone.completed when no sibling plans remain active", async () => {
      await boot({
        ...defaultMocks(),
        milestone: {
          ...defaultMocks().milestone,
          siblingActiveCount: 0,
        },
      });

      await service.submitDebrief(goalId, userId, dto);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "milestone.completed",
        expect.objectContaining({
          userId,
          goalId,
          milestoneId: "milestone-uuid",
          completedAt: expect.any(String),
        }),
      );
    });

    it("does not emit milestone.completed when the milestone row is already completed (race guard)", async () => {
      await boot({
        ...defaultMocks(),
        milestone: {
          ...defaultMocks().milestone,
          siblingActiveCount: 0,
          milestoneUpdate: { data: null, error: null },
        },
      });

      await service.submitDebrief(goalId, userId, dto);

      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        "milestone.completed",
        expect.anything(),
      );
    });

    it("does not run milestone detection when the plan was not closed by this debrief", async () => {
      await boot({
        ...defaultMocks(),
        planCompletes: false,
        milestone: {
          ...defaultMocks().milestone,
          siblingActiveCount: 0,
        },
      });

      await service.submitDebrief(goalId, userId, dto);

      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        "weekly-plan.completed",
        expect.anything(),
      );
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        "milestone.completed",
        expect.anything(),
      );
    });
  });
});
