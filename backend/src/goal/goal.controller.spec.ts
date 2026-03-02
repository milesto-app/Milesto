import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GoalController } from './goal.controller.js';
import { GoalService } from './goal.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';

const DEFAULT_LIMIT = 20;
const CUSTOM_LIMIT = 10;
const CUSTOM_OFFSET = 5;

let controller: GoalController;
let goalService: {
  create: jest.Mock;
  findAll: jest.Mock;
  findOne: jest.Mock;
  delete: jest.Mock;
  getGoalProfile: jest.Mock;
};

beforeEach(async () => {
  goalService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
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
    const dto = { title: 'Run a marathon', description: 'Complete a full marathon' };
    const expectedGoal = { id: 'goal-456', ...dto, status: 'intake_in_progress' };
    goalService.create.mockResolvedValue(expectedGoal);

    const result = await controller.create('user-123', dto);

    expect(goalService.create).toHaveBeenCalledWith('user-123', dto.title, dto.description);
    expect(result).toEqual(expectedGoal);
  });
});

describe('GoalController.findAll', () => {
  it('should call goalService.findAll with default params', async () => {
    const expectedResult = { data: [{ id: 'goal-1' }], total: 1, limit: DEFAULT_LIMIT, offset: 0 };
    goalService.findAll.mockResolvedValue(expectedResult);

    const result = await controller.findAll('user-123', { limit: DEFAULT_LIMIT, offset: 0 });

    expect(goalService.findAll).toHaveBeenCalledWith('user-123', DEFAULT_LIMIT, 0);
    expect(result).toEqual(expectedResult);
  });

  it('should pass custom limit and offset to service', async () => {
    goalService.findAll.mockResolvedValue({
      data: [],
      total: 0,
      limit: CUSTOM_LIMIT,
      offset: CUSTOM_OFFSET,
    });

    await controller.findAll('user-123', { limit: CUSTOM_LIMIT, offset: CUSTOM_OFFSET });

    expect(goalService.findAll).toHaveBeenCalledWith('user-123', CUSTOM_LIMIT, CUSTOM_OFFSET);
  });
});

describe('GoalController.findOne', () => {
  it('should call goalService.findOne with correct params', async () => {
    const expectedGoal = { id: 'goal-456', status: 'intake_in_progress' };
    goalService.findOne.mockResolvedValue(expectedGoal);

    const result = await controller.findOne('user-123', 'goal-456');

    expect(goalService.findOne).toHaveBeenCalledWith('user-123', 'goal-456');
    expect(result).toEqual(expectedGoal);
  });
});

describe('GoalController.getGoalProfile', () => {
  it('should call goalService.getGoalProfile with correct params', async () => {
    const expectedProfile = { id: 'profile-1', goal_id: 'goal-456' };
    goalService.getGoalProfile.mockResolvedValue(expectedProfile);

    const result = await controller.getGoalProfile('user-123', 'goal-456');

    expect(goalService.getGoalProfile).toHaveBeenCalledWith('user-123', 'goal-456');
    expect(result).toEqual(expectedProfile);
  });
});

describe('GoalController.delete', () => {
  it('should call goalService.delete and return void', async () => {
    goalService.delete.mockResolvedValue(undefined);

    await controller.delete('user-123', 'goal-456');

    expect(goalService.delete).toHaveBeenCalledWith('user-123', 'goal-456');
  });
});
