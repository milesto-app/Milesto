import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { SupabaseService } from '../supabase/supabase.service.js';
import { RoadmapController } from './roadmap.controller.js';
import { RoadmapService } from './roadmap.service.js';
import { WeeklyPlanService } from './weekly-plan.service.js';

describe('RoadmapController', () => {
  let controller: RoadmapController;
  let mockRoadmapService: {
    generateMilestones: jest.Mock;
  };
  let mockWeeklyPlanService: {
    generateWeeklyPlan: jest.Mock;
  };

  const userId = 'user-123';
  const goalId = 'goal-456';

  const mockRoadmap = {
    id: 'roadmap-789',
    goal_id: goalId,
    user_id: userId,
    status: 'complete',
    generation_attempts: 1,
    milestones: [{ id: 'ms-1', title: 'M1', order_index: 1 }],
  };

  const mockWeeklyPlan = {
    id: 'plan-uuid',
    objectives: ['Run 3 times', 'Research gear'],
    status: 'active',
  };

  beforeEach(async () => {
    mockRoadmapService = {
      generateMilestones: jest.fn(),
    };

    mockWeeklyPlanService = {
      generateWeeklyPlan: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoadmapController],
      providers: [
        { provide: RoadmapService, useValue: mockRoadmapService },
        { provide: WeeklyPlanService, useValue: mockWeeklyPlanService },
        { provide: SupabaseService, useValue: {} },
      ],
    }).compile();

    controller = module.get<RoadmapController>(RoadmapController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /generate', () => {
    it('should call generateMilestones and return roadmap', async () => {
      mockRoadmapService.generateMilestones.mockResolvedValue(mockRoadmap);

      const result = await controller.generateRoadmap(goalId, userId);

      expect(mockRoadmapService.generateMilestones).toHaveBeenCalledWith(
        goalId,
        userId,
      );
      expect(result).toEqual(mockRoadmap);
    });
  });

  describe('POST /weekly-plan/generate', () => {
    it('should call generateWeeklyPlan with goalId and userId', async () => {
      mockWeeklyPlanService.generateWeeklyPlan.mockResolvedValue(
        mockWeeklyPlan,
      );

      const result = await controller.generateWeeklyPlan(goalId, userId);

      expect(mockWeeklyPlanService.generateWeeklyPlan).toHaveBeenCalledWith(
        goalId,
        userId,
      );
      expect(result).toEqual(mockWeeklyPlan);
    });
  });
});
