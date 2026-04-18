import { InternalServerErrorException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { SupabaseService } from '../supabase/supabase.service.js';
import type { StoreTasksParams } from './weekly-task-storage.service.js';
import { WeeklyTaskStorageService } from './weekly-task-storage.service.js';

const GOAL_ID = 'goal-uuid';
const USER_ID = 'user-uuid';
const PLAN_ID = 'plan-uuid';

interface MockResult {
  data: unknown;
  error: unknown;
}

function createQueryBuilder(resolveValue: MockResult): Record<string, unknown> {
  const builder: Record<string, unknown> = {};
  const chainMethods = ['select', 'eq', 'insert', 'order'];
  for (const method of chainMethods) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }
  builder.then = async (
    resolve: (value: MockResult) => void,
    reject?: (error: unknown) => void,
  ) => Promise.resolve(resolveValue).then(resolve, reject);
  return builder;
}

function buildStoreParams(): StoreTasksParams {
  return {
    tasks: [
      {
        title: 'Task 1',
        description: 'First',
        order_index: 1,
        difficulty_rating: null,
      },
      {
        title: 'Task 2',
        description: 'Second',
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

describe('WeeklyTaskStorageService', () => {
  let service: WeeklyTaskStorageService;
  let mockFrom: jest.Mock;

  beforeEach(async () => {
    mockFrom = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeeklyTaskStorageService,
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: () => ({ from: mockFrom }),
          },
        },
      ],
    }).compile();

    service = module.get<WeeklyTaskStorageService>(WeeklyTaskStorageService);
  });

  describe('storeTasks', () => {
    it('should return inserted tasks when insert succeeds', async () => {
      const inserted = [
        { id: 't1', order_index: 1 },
        { id: 't2', order_index: 2 },
      ];
      mockFrom.mockReturnValue(
        createQueryBuilder({ data: inserted, error: null }),
      );

      const result = await service.storeTasks(buildStoreParams());

      expect(result).toEqual(inserted);
    });

    it('should return existing tasks when insert hits unique violation', async () => {
      const existing = [
        { id: 't1', order_index: 1 },
        { id: 't2', order_index: 2 },
      ];
      mockFrom
        .mockReturnValueOnce(
          createQueryBuilder({
            data: null,
            error: { code: '23505', message: 'duplicate key' },
          }),
        )
        .mockReturnValueOnce(
          createQueryBuilder({ data: existing, error: null }),
        );

      const result = await service.storeTasks(buildStoreParams());

      expect(result).toEqual(existing);
    });

    it('should throw InternalServerErrorException when insert fails with other error', async () => {
      mockFrom.mockReturnValue(
        createQueryBuilder({
          data: null,
          error: { code: '08006', message: 'connection failure' },
        }),
      );

      await expect(service.storeTasks(buildStoreParams())).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
