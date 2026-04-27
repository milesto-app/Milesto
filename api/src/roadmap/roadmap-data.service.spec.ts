import {
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { SupabaseService } from "../supabase/supabase.service.js";
import type { StoreTasksParams } from "./roadmap-data.service.js";
import { RoadmapDataService } from "./roadmap-data.service.js";

const GOAL_ID = "goal-uuid";
const USER_ID = "user-uuid";
const PLAN_ID = "plan-uuid";

interface MockResult {
  data: unknown;
  error: unknown;
}

function createQueryBuilder(resolveValue: MockResult): Record<string, unknown> {
  const builder: Record<string, unknown> = {};
  const chainMethods = [
    "select",
    "eq",
    "neq",
    "order",
    "limit",
    "upsert",
    "update",
    "insert",
    "lt",
    "is",
  ];
  for (const method of chainMethods) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }
  builder.single = jest.fn().mockReturnValue(Promise.resolve(resolveValue));
  builder.then = async (
    resolve: (value: MockResult) => void,
    reject?: (error: unknown) => void,
  ) => Promise.resolve(resolveValue).then(resolve, reject);
  return builder;
}

function makeMilestone(
  id: string,
  orderIndex: number,
): Record<string, unknown> {
  return {
    id,
    goal_id: GOAL_ID,
    order_index: orderIndex,
    title: `Milestone ${String(orderIndex)}`,
    description: `Description ${String(orderIndex)}`,
    expected_outcome: `Outcome ${String(orderIndex)}`,
    created_at: "2026-01-01T00:00:00Z",
  };
}

function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function daysAgo(days: number): string {
  return daysFromNow(-days);
}

function buildStoreParams(): StoreTasksParams {
  return {
    tasks: [
      {
        title: "Task 1",
        description: "First",
        order_index: 1,
        difficulty_rating: null,
      },
      {
        title: "Task 2",
        description: "Second",
        order_index: 2,
        difficulty_rating: null,
      },
    ],
    weeklyPlanId: PLAN_ID,
    goalId: GOAL_ID,
    userId: USER_ID,
    isFallback: false,
  };
}

describe("RoadmapDataService", () => {
  let service: RoadmapDataService;
  let mockFrom: jest.Mock;

  beforeEach(async () => {
    mockFrom = jest
      .fn()
      .mockReturnValue(createQueryBuilder({ data: null, error: null }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoadmapDataService,
        {
          provide: SupabaseService,
          useValue: { getAdminClient: () => ({ from: mockFrom }) },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<RoadmapDataService>(RoadmapDataService);
  });

  describe("storeMilestones", () => {
    it("groups weekly steps into four-step months and ignores checkpoint flags", async () => {
      const insert = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ insert });

      await service.storeMilestones("goal-123", [
        {
          title: "Step 1",
          description: "Week 1",
          expected_outcome: "Outcome 1",
          is_monthly_checkpoint: true,
          order_index: 1,
        },
        {
          title: "Step 4",
          description: "Week 4",
          expected_outcome: "Outcome 4",
          is_monthly_checkpoint: true,
          order_index: 4,
        },
        {
          title: "Step 5",
          description: "Week 5",
          expected_outcome: "Outcome 5",
          is_monthly_checkpoint: true,
          order_index: 5,
        },
      ]);

      expect(mockFrom).toHaveBeenCalledWith("milestones");
      expect(insert).toHaveBeenCalledWith([
        expect.objectContaining({
          target_month: 1,
          target_week: 1,
          is_monthly_checkpoint: false,
          order_index: 1,
        }),
        expect.objectContaining({
          target_month: 1,
          target_week: 4,
          is_monthly_checkpoint: false,
          order_index: 4,
        }),
        expect.objectContaining({
          target_month: 2,
          target_week: 5,
          is_monthly_checkpoint: false,
          order_index: 5,
        }),
      ]);
    });
  });

  describe("storeTasks", () => {
    it("should return inserted tasks when insert succeeds", async () => {
      const inserted = [
        { id: "t1", order_index: 1 },
        { id: "t2", order_index: 2 },
      ];
      mockFrom.mockReturnValue(
        createQueryBuilder({ data: inserted, error: null }),
      );

      const result = await service.storeTasks(buildStoreParams());

      expect(result).toEqual(inserted);
    });

    it("should return existing tasks when insert hits unique violation", async () => {
      const existing = [
        { id: "t1", order_index: 1 },
        { id: "t2", order_index: 2 },
      ];
      mockFrom
        .mockReturnValueOnce(
          createQueryBuilder({
            data: null,
            error: { code: "23505", message: "duplicate key" },
          }),
        )
        .mockReturnValueOnce(
          createQueryBuilder({ data: existing, error: null }),
        );

      const result = await service.storeTasks(buildStoreParams());

      expect(result).toEqual(existing);
    });

    it("should throw InternalServerErrorException when insert fails with other error", async () => {
      mockFrom.mockReturnValue(
        createQueryBuilder({
          data: null,
          error: { code: "08006", message: "connection failure" },
        }),
      );

      await expect(service.storeTasks(buildStoreParams())).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe("loadRoadmapAndMilestone", () => {
    const goalRow = {
      id: GOAL_ID,
      user_id: USER_ID,
      roadmap_status: "complete",
      roadmap_generation_attempts: 1,
      roadmap_model_used: null,
      roadmap_generation_metadata: {},
      roadmap_quality_scores: null,
      roadmap_created_at: daysAgo(90),
      roadmap_updated_at: daysAgo(90),
      target_date: null as string | null,
    };

    const milestones = [
      makeMilestone("ms-1", 1),
      makeMilestone("ms-2", 2),
      makeMilestone("ms-3", 3),
    ];

    function setupMocks(options: {
      lastPlanMilestoneId?: string | null;
      targetDate?: string | null;
      roadmapCreatedAt?: string;
      milestoneList?: typeof milestones;
    }): void {
      const createdAt = options.roadmapCreatedAt ?? goalRow.roadmap_created_at;
      const currentMilestones = options.milestoneList ?? milestones;
      let goalCallIndex = 0;

      mockFrom.mockImplementation((table: string) => {
        if (table === "goals") {
          goalCallIndex += 1;
          if (goalCallIndex === 1) {
            return createQueryBuilder({
              data: { ...goalRow, roadmap_created_at: createdAt },
              error: null,
            });
          }
          return createQueryBuilder({
            data: { target_date: options.targetDate ?? null },
            error: null,
          });
        }
        if (table === "milestones") {
          return createQueryBuilder({
            data: currentMilestones,
            error: null,
          });
        }
        if (table === "weekly_plans") {
          if (options.lastPlanMilestoneId === null) {
            return createQueryBuilder({
              data: null,
              error: { message: "not found" },
            });
          }
          return createQueryBuilder({
            data: { milestone_id: options.lastPlanMilestoneId },
            error: null,
          });
        }
        return createQueryBuilder({ data: null, error: null });
      });
    }

    it("should return first milestone when no plan history and roadmap just created", async () => {
      setupMocks({
        lastPlanMilestoneId: null,
        targetDate: daysFromNow(90),
        roadmapCreatedAt: new Date().toISOString(),
      });

      const result = await service.loadRoadmapAndMilestone(GOAL_ID, USER_ID);

      expect(result.milestone.id).toBe("ms-1");
    });

    it("should return middle milestone at midpoint of timeline", async () => {
      setupMocks({
        lastPlanMilestoneId: null,
        targetDate: daysFromNow(45),
        roadmapCreatedAt: daysAgo(45),
      });

      const result = await service.loadRoadmapAndMilestone(GOAL_ID, USER_ID);

      expect(result.milestone.id).toBe("ms-2");
    });

    it("should return last milestone when past deadline", async () => {
      setupMocks({
        lastPlanMilestoneId: null,
        targetDate: daysAgo(10),
        roadmapCreatedAt: daysAgo(100),
      });

      const result = await service.loadRoadmapAndMilestone(GOAL_ID, USER_ID);

      expect(result.milestone.id).toBe("ms-3");
    });

    it("should return first milestone when target_date is null", async () => {
      setupMocks({
        lastPlanMilestoneId: null,
        targetDate: null,
      });

      const result = await service.loadRoadmapAndMilestone(GOAL_ID, USER_ID);

      expect(result.milestone.id).toBe("ms-1");
    });

    it("should return first milestone when target_date is before created_at", async () => {
      setupMocks({
        lastPlanMilestoneId: null,
        targetDate: daysAgo(100),
        roadmapCreatedAt: daysAgo(10),
      });

      const result = await service.loadRoadmapAndMilestone(GOAL_ID, USER_ID);

      expect(result.milestone.id).toBe("ms-1");
    });

    it("should never regress below history-based index", async () => {
      setupMocks({
        lastPlanMilestoneId: "ms-3",
        targetDate: daysFromNow(60),
        roadmapCreatedAt: daysAgo(10),
      });

      const result = await service.loadRoadmapAndMilestone(GOAL_ID, USER_ID);

      expect(result.milestone.id).toBe("ms-3");
    });

    it("should allow time to push ahead of history", async () => {
      setupMocks({
        lastPlanMilestoneId: "ms-1",
        targetDate: daysFromNow(1),
        roadmapCreatedAt: daysAgo(90),
      });

      const result = await service.loadRoadmapAndMilestone(GOAL_ID, USER_ID);

      expect(result.milestone.id).toBe("ms-3");
    });

    it("should fall back to index 0 when prior milestone_id is not found", async () => {
      setupMocks({
        lastPlanMilestoneId: "unknown-milestone-id",
        targetDate: daysFromNow(90),
        roadmapCreatedAt: new Date().toISOString(),
      });

      const result = await service.loadRoadmapAndMilestone(GOAL_ID, USER_ID);

      expect(result.milestone.id).toBe("ms-1");
    });

    it("should return single milestone directly", async () => {
      setupMocks({
        lastPlanMilestoneId: null,
        targetDate: daysFromNow(90),
        milestoneList: [makeMilestone("ms-only", 1)],
      });

      const result = await service.loadRoadmapAndMilestone(GOAL_ID, USER_ID);

      expect(result.milestone.id).toBe("ms-only");
    });

    it("should throw NotFoundException when no milestones exist", async () => {
      setupMocks({
        lastPlanMilestoneId: null,
        targetDate: null,
        milestoneList: [],
      });

      await expect(
        service.loadRoadmapAndMilestone(GOAL_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
