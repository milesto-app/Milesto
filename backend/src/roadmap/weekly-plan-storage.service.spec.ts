import { NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { SupabaseService } from '../supabase/supabase.service.js';
import { WeeklyPlanStorageService } from './weekly-plan-storage.service.js';

const GOAL_ID = 'goal-uuid';
const USER_ID = 'user-uuid';
const ROADMAP_ID = 'roadmap-uuid';

function makeMilestone(id: string, orderIndex: number) {
  return {
    id,
    roadmap_id: ROADMAP_ID,
    goal_id: GOAL_ID,
    order_index: orderIndex,
    title: `Milestone ${String(orderIndex)}`,
    description: `Description ${String(orderIndex)}`,
    expected_outcome: `Outcome ${String(orderIndex)}`,
    target_month: orderIndex,
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

function createQueryBuilder(resolveValue: MockResult) {
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
  builder.then = (
    resolve: (value: MockResult) => void,
    reject?: (error: unknown) => void,
  ) => Promise.resolve(resolveValue).then(resolve, reject);
  return builder;
}

describe('WeeklyPlanStorageService', () => {
  let service: WeeklyPlanStorageService;
  let mockFrom: jest.Mock;

  const roadmap = {
    id: ROADMAP_ID,
    goal_id: GOAL_ID,
    user_id: USER_ID,
    status: 'complete',
    created_at: daysAgo(90),
    updated_at: daysAgo(90),
    generation_attempts: 1,
    model_used: null,
    generation_metadata: {},
    quality_scores: null,
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
  }) {
    const createdAt = options.roadmapCreatedAt ?? roadmap.created_at;
    const currentRoadmap = { ...roadmap, created_at: createdAt };
    const currentMilestones = options.milestoneList ?? milestones;

    mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === 'roadmaps') {
        return createQueryBuilder({
          data: currentRoadmap,
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
      if (table === 'goals') {
        return createQueryBuilder({
          data: { target_date: options.targetDate ?? null },
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
