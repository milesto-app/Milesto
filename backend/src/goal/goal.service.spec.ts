import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AiService } from '../ai/ai.service.js';
import { UserLanguageService } from '../common/user-language.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { UsageService } from '../usage/usage.service.js';
import { GoalService } from './goal.service.js';
import { GOAL_STATUS } from './goal-status.constants.js';

let service: GoalService;
let mockSupabase: { from: jest.Mock };
let mockAiService: { generateJson: jest.Mock };

function mockInsertChain(data: unknown, error: unknown = null): void {
  mockSupabase.from.mockReturnValue({
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data, error }),
      }),
    }),
  });
}

function mockFindOneChain(data: unknown, error: unknown): void {
  mockSupabase.from.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          is: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data, error }),
          }),
        }),
      }),
    }),
  });
}

beforeEach(async () => {
  mockSupabase = { from: jest.fn() };
  mockAiService = { generateJson: jest.fn() };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      GoalService,
      {
        provide: SupabaseService,
        useValue: { getAdminClient: () => mockSupabase },
      },
      { provide: AiService, useValue: mockAiService },
      {
        provide: UsageService,
        useValue: {
          reserveGeneration: jest.fn().mockResolvedValue({
            granted: true,
            used: 1,
            limit: 20,
            is_pro: false,
          }),
        },
      },
      {
        provide: UserLanguageService,
        useValue: { getLanguage: jest.fn().mockResolvedValue('en') },
      },
    ],
  }).compile();

  service = module.get<GoalService>(GoalService);
});

it('GoalService should be defined', () => {
  expect(service).toBeDefined();
});

describe('GoalService.create', () => {
  it('should create a goal with provided title', async () => {
    const createdGoal = {
      id: 'goal-456',
      user_id: 'user-123',
      title: 'Run a marathon',
      description: 'Complete a full marathon within 6 months',
      status: GOAL_STATUS.INTAKE_IN_PROGRESS,
      profile_generation_attempts: 0,
      created_at: '2026-02-08T00:00:00.000Z',
      updated_at: '2026-02-08T00:00:00.000Z',
    };

    mockInsertChain(createdGoal);
    const result = await service.create(
      'user-123',
      'Complete a full marathon within 6 months',
      'Run a marathon',
    );
    expect(result).toEqual(createdGoal);
    expect(mockAiService.generateJson).not.toHaveBeenCalled();
  });

  it('should throw InternalServerErrorException on Supabase error', async () => {
    mockInsertChain(null, { message: 'Database error' });
    await expect(service.create('user-123', 'Desc', 'Title')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});

describe('GoalService.create - AI title generation', () => {
  const baseGoal = {
    id: 'goal-456',
    user_id: 'user-123',
    description: 'Complete a full marathon within 6 months',
    status: GOAL_STATUS.INTAKE_IN_PROGRESS,
    profile_generation_attempts: 0,
    created_at: '2026-02-08T00:00:00.000Z',
    updated_at: '2026-02-08T00:00:00.000Z',
  };

  it('should generate title via AI when title is omitted', async () => {
    const goal = { ...baseGoal, title: 'Complete a Full Marathon' };
    mockAiService.generateJson.mockResolvedValue({
      title: 'Complete a Full Marathon',
    });
    mockInsertChain(goal);

    const result = await service.create('user-123', baseGoal.description);
    expect(result).toEqual(goal);
    expect(mockAiService.generateJson).toHaveBeenCalledTimes(1);
  });

  it('should fall back to truncated description when AI fails', async () => {
    const goal = { ...baseGoal, title: baseGoal.description };
    mockAiService.generateJson.mockRejectedValue(new Error('AI timeout'));
    mockInsertChain(goal);

    const result = await service.create('user-123', baseGoal.description);
    expect(result).toEqual(goal);
  });
});

describe('GoalService.findOne', () => {
  it('should return goal when found', async () => {
    const goal = {
      id: 'goal-456',
      user_id: 'user-123',
      status: GOAL_STATUS.INTAKE_IN_PROGRESS,
    };
    mockFindOneChain(goal, null);

    const result = await service.findOne('user-123', 'goal-456');
    expect(result).toEqual(goal);
  });

  it('should throw NotFoundException when goal not found', async () => {
    mockFindOneChain(null, { code: 'PGRST116', message: 'not found' });
    await expect(service.findOne('user-123', 'goal-456')).rejects.toThrow(
      NotFoundException,
    );
  });
});
