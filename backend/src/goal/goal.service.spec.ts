import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { GoalService } from './goal.service.js';
import { AiService } from '../ai/ai.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { GOAL_STATUS } from './goal-status.constants.js';

const DEFAULT_LIMIT = 20;
const CUSTOM_LIMIT = 10;
const CUSTOM_OFFSET = 5;
const EXPECTED_RANGE_END = 14;

let service: GoalService;
let mockSupabase: { from: jest.Mock };
let mockAiService: { generateJSON: jest.Mock };

function mockInsertChain(data: unknown, error: unknown = null): void {
  mockSupabase.from.mockReturnValue({
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data, error }),
      }),
    }),
  });
}

function mockSelectChain(data: unknown, error: unknown, count: unknown): void {
  mockSupabase.from.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({ data, error, count }),
        }),
      }),
    }),
  });
}

function mockFindOneChain(data: unknown, error: unknown): void {
  mockSupabase.from.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data, error }),
        }),
      }),
    }),
  });
}

beforeEach(async () => {
  mockSupabase = { from: jest.fn() };
  mockAiService = { generateJSON: jest.fn() };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      GoalService,
      { provide: SupabaseService, useValue: { getAdminClient: () => mockSupabase } },
      { provide: AiService, useValue: mockAiService },
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
    expect(mockAiService.generateJSON).not.toHaveBeenCalled();
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
    mockAiService.generateJSON.mockResolvedValue({ title: 'Complete a Full Marathon' });
    mockInsertChain(goal);

    const result = await service.create('user-123', baseGoal.description);
    expect(result).toEqual(goal);
    expect(mockAiService.generateJSON).toHaveBeenCalledTimes(1);
  });

  it('should fall back to truncated description when AI fails', async () => {
    const goal = { ...baseGoal, title: baseGoal.description };
    mockAiService.generateJSON.mockRejectedValue(new Error('AI timeout'));
    mockInsertChain(goal);

    const result = await service.create('user-123', baseGoal.description);
    expect(result).toEqual(goal);
  });
});

describe('GoalService.findAll', () => {
  it('should return paginated response', async () => {
    const goals = [{ id: 'goal-1', status: GOAL_STATUS.INTAKE_IN_PROGRESS }];
    mockSelectChain(goals, null, 1);

    const result = await service.findAll('user-123', DEFAULT_LIMIT, 0);
    expect(result).toEqual({ data: goals, total: 1, limit: DEFAULT_LIMIT, offset: 0 });
  });

  it('should pass correct range params', async () => {
    const rangeMock = jest.fn().mockResolvedValue({ data: [], error: null, count: 0 });
    const orderMock = jest.fn().mockReturnValue({ range: rangeMock });
    const eqMock = jest.fn().mockReturnValue({ order: orderMock });
    mockSupabase.from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: eqMock }) });

    await service.findAll('user-123', CUSTOM_LIMIT, CUSTOM_OFFSET);
    expect(rangeMock).toHaveBeenCalledWith(CUSTOM_OFFSET, EXPECTED_RANGE_END);
  });

  it('should throw InternalServerErrorException on Supabase error', async () => {
    mockSelectChain(null, { message: 'Database error' }, null);
    await expect(service.findAll('user-123', DEFAULT_LIMIT, 0)).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});

describe('GoalService.findOne', () => {
  it('should return goal when found', async () => {
    const goal = { id: 'goal-456', user_id: 'user-123', status: GOAL_STATUS.INTAKE_IN_PROGRESS };
    mockFindOneChain(goal, null);

    const result = await service.findOne('user-123', 'goal-456');
    expect(result).toEqual(goal);
  });

  it('should throw NotFoundException when goal not found', async () => {
    mockFindOneChain(null, { code: 'PGRST116', message: 'not found' });
    await expect(service.findOne('user-123', 'goal-456')).rejects.toThrow(NotFoundException);
  });
});
