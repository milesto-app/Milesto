import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AiService } from '../ai/ai.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { UsageService } from '../usage/usage.service.js';
import { GoalService } from './goal.service.js';
import { GOAL_STATUS } from './goal-status.constants.js';

let service: GoalService;
let mockSupabase: { from: jest.Mock };

const mockGoal = (status: string): Record<string, unknown> => ({
  id: 'goal-456',
  user_id: 'user-123',
  status,
});

beforeEach(async () => {
  mockSupabase = { from: jest.fn() };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      GoalService,
      {
        provide: SupabaseService,
        useValue: { getAdminClient: () => mockSupabase },
      },
      { provide: AiService, useValue: { generateJson: jest.fn() } },
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
    ],
  }).compile();

  service = module.get<GoalService>(GoalService);
});

describe('GoalService.getGoalProfile', () => {
  const mockGoalRow = {
    id: 'goal-456',
    profile_data: { current_state: 'Beginner' },
    narrative_summary: 'Summary',
    profile_created_at: '2026-02-08T00:00:00.000Z',
  };
  const expectedProfile = {
    id: 'goal-456',
    goal_id: 'goal-456',
    profile_data: { current_state: 'Beginner' },
    narrative_summary: 'Summary',
    created_at: '2026-02-08T00:00:00.000Z',
  };

  it('should return profile when status is intake_completed', async () => {
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue(mockGoal(GOAL_STATUS.INTAKE_COMPLETED) as never);

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: mockGoalRow, error: null }),
          }),
        }),
      }),
    });

    const result = await service.getGoalProfile('user-123', 'goal-456');
    expect(result).toEqual(expectedProfile);
  });

  it('should throw NotFoundException when status is intake_in_progress', async () => {
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue(mockGoal(GOAL_STATUS.INTAKE_IN_PROGRESS) as never);

    await expect(
      service.getGoalProfile('user-123', 'goal-456'),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('GoalService.updateStatus', () => {
  it('should update goal status successfully', async () => {
    const isMock = jest.fn().mockResolvedValue({ error: null });
    const eqMock = jest.fn().mockReturnValue({ is: isMock });
    const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
    mockSupabase.from.mockReturnValue({ update: updateMock });

    await expect(
      service.updateStatus('goal-456', 'active'),
    ).resolves.toBeUndefined();
  });

  it('should throw InternalServerErrorException on Supabase error', async () => {
    const isMock = jest
      .fn()
      .mockResolvedValue({ error: { message: 'DB error' } });
    const eqMock = jest.fn().mockReturnValue({ is: isMock });
    const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
    mockSupabase.from.mockReturnValue({ update: updateMock });

    await expect(service.updateStatus('goal-456', 'active')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
