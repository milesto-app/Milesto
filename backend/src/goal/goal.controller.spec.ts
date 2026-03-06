import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { SupabaseService } from '../supabase/supabase.service.js';
import { GoalController } from './goal.controller.js';
import { GoalService } from './goal.service.js';

let controller: GoalController;
let goalService: {
  create: jest.Mock;
  getGoalProfile: jest.Mock;
};

beforeEach(async () => {
  goalService = {
    create: jest.fn(),
    getGoalProfile: jest.fn(),
  };

  const module: TestingModule = await Test.createTestingModule({
    controllers: [GoalController],
    providers: [
      { provide: GoalService, useValue: goalService },
      { provide: SupabaseService, useValue: {} },
    ],
  }).compile();

  controller = module.get<GoalController>(GoalController);
});

it('GoalController should be defined', () => {
  expect(controller).toBeDefined();
});

describe('GoalController.create', () => {
  it('should call goalService.create with correct params', async () => {
    const dto = {
      title: 'Run a marathon',
      description: 'Complete a full marathon',
    };
    const expectedGoal = {
      id: 'goal-456',
      ...dto,
      status: 'intake_in_progress',
    };
    goalService.create.mockResolvedValue(expectedGoal);

    const result = await controller.create('user-123', dto);

    expect(goalService.create).toHaveBeenCalledWith(
      'user-123',
      dto.description,
      dto.title,
    );
    expect(result).toEqual(expectedGoal);
  });
});

describe('GoalController.getGoalProfile', () => {
  it('should call goalService.getGoalProfile with correct params', async () => {
    const expectedProfile = { id: 'profile-1', goal_id: 'goal-456' };
    goalService.getGoalProfile.mockResolvedValue(expectedProfile);

    const result = await controller.getGoalProfile('user-123', 'goal-456');

    expect(goalService.getGoalProfile).toHaveBeenCalledWith(
      'user-123',
      'goal-456',
    );
    expect(result).toEqual(expectedProfile);
  });
});
