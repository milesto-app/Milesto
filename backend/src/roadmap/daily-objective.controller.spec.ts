/* eslint-disable max-lines-per-function */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DailyObjectiveController } from './daily-objective.controller.js';
import { DailyObjectiveService } from './daily-objective.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';

describe('DailyObjectiveController', () => {
  let controller: DailyObjectiveController;
  let mockDailyObjectiveService: {
    getDailyObjectives: jest.Mock;
    updateDailyObjective: jest.Mock;
  };

  const userId = 'user-123';
  const goalId = 'goal-456';

  beforeEach(async () => {
    mockDailyObjectiveService = {
      getDailyObjectives: jest.fn(),
      updateDailyObjective: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DailyObjectiveController],
      providers: [
        { provide: DailyObjectiveService, useValue: mockDailyObjectiveService },
        { provide: SupabaseService, useValue: {} },
      ],
    }).compile();

    controller = module.get<DailyObjectiveController>(DailyObjectiveController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /daily-objectives', () => {
    it('should delegate to dailyObjectiveService.getDailyObjectives', async () => {
      const mockObjectives = [
        { id: 'obj-1', title: 'Morning run', order_index: 1, is_completed: false },
      ];
      mockDailyObjectiveService.getDailyObjectives.mockResolvedValue(mockObjectives);

      const result = await controller.getDailyObjectives(goalId, userId);

      expect(mockDailyObjectiveService.getDailyObjectives).toHaveBeenCalledWith(goalId, userId);
      expect(result).toEqual(mockObjectives);
    });
  });

  describe('PATCH /daily-objectives/:objectiveId', () => {
    it('should delegate to dailyObjectiveService.updateDailyObjective', async () => {
      const objectiveId = 'obj-789';
      const mockUpdated = { id: objectiveId, is_completed: true };
      mockDailyObjectiveService.updateDailyObjective.mockResolvedValue(mockUpdated);

      const result = await controller.updateObjective(goalId, objectiveId, userId, {
        is_completed: true,
      });

      expect(mockDailyObjectiveService.updateDailyObjective).toHaveBeenCalledWith({
        objectiveId,
        goalId,
        userId,
        isCompleted: true,
      });
      expect(result).toEqual(mockUpdated);
    });
  });
});
