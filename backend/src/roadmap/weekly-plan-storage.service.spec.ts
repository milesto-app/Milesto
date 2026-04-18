import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { SupabaseService } from '../supabase/supabase.service.js';
import { WeeklyPlanStorageService } from './weekly-plan-storage.service.js';

const GOAL_ID = 'goal-uuid';
const USER_ID = 'user-uuid';

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
    created_at: '2026-01-01T00:00:00Z',
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

interface MockResult {
  data: unknown;
  error: unknown;
}

function createQueryBuilder(resolveValue: MockResult): Record<string, unknown> {
  const builder: Record<string, unknown> = {};
  const chainMethods = [
    'select',
    'eq',
    'neq',
    'order',
    'limit',
    'upsert',
    'update',
    'lt',
    'is',
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

describe('WeeklyPlanStorageService', () => {
  let service: WeeklyPlanStorageService;
  let mockFrom: jest.Mock;

  const goalRow = {
    id: GOAL_ID,
    user_id: USER_ID,
    roadmap_status: 'complete',
    roadmap_generation_attempts: 1,
    roadmap_model_used: null,
    roadmap_generation_metadata: {},
    roadmap_quality_scores: null,
    roadmap_created_at: daysAgo(90),
    roadmap_updated_at: daysAgo(90),
    target_date: null as string | null,
  };

  const milestones = [
    makeMilestone('ms-1', 1),
    makeMilestone('ms-2', 2),
    makeMilestone('ms-3', 3),
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

    mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === 'goals') {
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
      if (table === 'milestones') {
        return createQueryBuilder({
          data: currentMilestones,
          error: null,
        });
      }
      if (table === 'weekly_plans') {
        if (options.lastPlanMilestoneId === null) {
          return createQueryBuilder({
            data: null,
            error: { message: 'not found' },
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

  beforeEach(async () => {
    mockFrom = jest
      .fn()
      .mockReturnValue(createQueryBuilder({ data: null, error: null }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeeklyPlanStorageService,
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: () => ({ from: mockFrom }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<WeeklyPlanStorageService>(WeeklyPlanStorageService);
  });

  describe('loadRoadmapAndMilestone', () => {
    it('should return first milestone when no plan history and roadmap just created', async () => {
      setupMocks({
        lastPlanMilestoneId: null,
        targetDate: daysFromNow(90),
        roadmapCreatedAt: new Date().toISOString(),
      });

      const result = await service.loadRoadmapAndMilestone(GOAL_ID, USER_ID);

      expect(result.milestone.id).toBe('ms-1');
    });

    it('should return middle milestone at midpoint of timeline', async () => {
      setupMocks({
        lastPlanMilestoneId: null,
        targetDate: daysFromNow(45),
        roadmapCreatedAt: daysAgo(45),
      });

      const result = await service.loadRoadmapAndMilestone(GOAL_ID, USER_ID);

      expect(result.milestone.id).toBe('ms-2');
    });

    it('should return last milestone when past deadline', async () => {
      setupMocks({
        lastPlanMilestoneId: null,
        targetDate: daysAgo(10),
        roadmapCreatedAt: daysAgo(100),
      });

      const result = await service.loadRoadmapAndMilestone(GOAL_ID, USER_ID);

      expect(result.milestone.id).toBe('ms-3');
    });

    it('should return first milestone when target_date is null', async () => {
      setupMocks({
        lastPlanMilestoneId: null,
        targetDate: null,
      });

      const result = await service.loadRoadmapAndMilestone(GOAL_ID, USER_ID);

      expect(result.milestone.id).toBe('ms-1');
    });

    it('should return first milestone when target_date is before created_at', async () => {
      setupMocks({
        lastPlanMilestoneId: null,
        targetDate: daysAgo(100),
        roadmapCreatedAt: daysAgo(10),
      });

      const result = await service.loadRoadmapAndMilestone(GOAL_ID, USER_ID);

      expect(result.milestone.id).toBe('ms-1');
    });

    it('should never regress below history-based index', async () => {
      setupMocks({
        lastPlanMilestoneId: 'ms-3',
        targetDate: daysFromNow(60),
        roadmapCreatedAt: daysAgo(10),
      });

      const result = await service.loadRoadmapAndMilestone(GOAL_ID, USER_ID);

      expect(result.milestone.id).toBe('ms-3');
    });

    it('should allow time to push ahead of history', async () => {
      setupMocks({
        lastPlanMilestoneId: 'ms-1',
        targetDate: daysFromNow(1),
        roadmapCreatedAt: daysAgo(90),
      });

      const result = await service.loadRoadmapAndMilestone(GOAL_ID, USER_ID);

      expect(result.milestone.id).toBe('ms-3');
    });

    it('should fall back to index 0 when prior milestone_id is not found', async () => {
      setupMocks({
        lastPlanMilestoneId: 'unknown-milestone-id',
        targetDate: daysFromNow(90),
        roadmapCreatedAt: new Date().toISOString(),
      });

      const result = await service.loadRoadmapAndMilestone(GOAL_ID, USER_ID);

      expect(result.milestone.id).toBe('ms-1');
    });

    it('should return single milestone directly', async () => {
      setupMocks({
        lastPlanMilestoneId: null,
        targetDate: daysFromNow(90),
        milestoneList: [makeMilestone('ms-only', 1)],
      });

      const result = await service.loadRoadmapAndMilestone(GOAL_ID, USER_ID);

      expect(result.milestone.id).toBe('ms-only');
    });

    it('should throw NotFoundException when no milestones exist', async () => {
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
