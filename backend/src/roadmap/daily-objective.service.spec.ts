import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DailyObjectiveService } from './daily-objective.service.js';
import { DailyObjectiveStorageService } from './daily-objective-storage.service.js';
import { UserLanguageService } from '../common/user-language.service.js';
import { ContextPipelineService } from './context-pipeline.service.js';
import { GenerationService } from './generation.service.js';
import { WeeklyPlanService } from './weekly-plan.service.js';

describe('DailyObjectiveService', () => {
  let service: DailyObjectiveService;
  let mockStorageService: {
    getExistingObjectives: jest.Mock;
    getCheckIn: jest.Mock;
    updateObjective: jest.Mock;
    storeObjectives: jest.Mock;
    getWeeklyCompletionRate: jest.Mock;
  };
  let mockContextPipelineService: { assembleContext: jest.Mock };
  let mockGenerationService: { generateDailyObjectives: jest.Mock };
  let mockEventEmitter: { emit: jest.Mock };
  let mockWeeklyPlanService: {
    getCurrentWeeklyPlan: jest.Mock;
    queryWeekData: jest.Mock;
  };

  const goalId = 'goal-uuid';
  const userId = 'user-uuid';

  beforeEach(async () => {
    mockStorageService = {
      getExistingObjectives: jest.fn(),
      getCheckIn: jest.fn(),
      updateObjective: jest.fn(),
      storeObjectives: jest.fn(),
      getWeeklyCompletionRate: jest.fn(),
    };
    mockContextPipelineService = { assembleContext: jest.fn() };
    mockGenerationService = { generateDailyObjectives: jest.fn() };
    mockEventEmitter = { emit: jest.fn() };
    mockWeeklyPlanService = {
      getCurrentWeeklyPlan: jest.fn(),
      queryWeekData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyObjectiveService,
        { provide: ContextPipelineService, useValue: mockContextPipelineService },
        { provide: GenerationService, useValue: mockGenerationService },
        { provide: DailyObjectiveStorageService, useValue: mockStorageService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: WeeklyPlanService, useValue: mockWeeklyPlanService },
        {
          provide: UserLanguageService,
          useValue: { getLanguage: jest.fn().mockResolvedValue('en') },
        },
      ],
    }).compile();

    service = module.get<DailyObjectiveService>(DailyObjectiveService);
  });

  describe('getDailyObjectives', () => {
    it('should return existing objectives when available', async () => {
      const mockObjectives = [{ id: 'obj-1', title: 'Task 1', is_completed: false }];
      mockStorageService.getExistingObjectives.mockResolvedValue(mockObjectives);

      const result = await service.getDailyObjectives(goalId, userId, '2026-02-22');
      expect(result).toEqual(mockObjectives);
    });

    it('should throw BadRequestException when no check-in exists', async () => {
      mockStorageService.getExistingObjectives.mockResolvedValue([]);
      mockStorageService.getCheckIn.mockResolvedValue(null);

      await expect(service.getDailyObjectives(goalId, userId, '2026-02-22')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateDailyObjective', () => {
    it('should throw NotFoundException when objective not found', async () => {
      mockStorageService.updateObjective.mockRejectedValue(
        new NotFoundException('Objective not found'),
      );

      await expect(
        service.updateDailyObjective({
          objectiveId: 'obj-uuid',
          goalId,
          userId,
          isCompleted: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
