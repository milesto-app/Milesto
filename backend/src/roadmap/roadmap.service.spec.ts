import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { UserLanguageService } from '../common/user-language.service.js';
import { GoalService } from '../goal/goal.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { UsageService } from '../usage/usage.service.js';
import { ContextPipelineService } from './context-pipeline.service.js';
import { GenerationService } from './generation.service.js';
import { RoadmapService } from './roadmap.service.js';
import { RoadmapStorageService } from './roadmap-storage.service.js';
import type { AssembledContext } from './types/context.types.js';

describe('RoadmapService', () => {
  let service: RoadmapService;
  let mockSupabase: { from: jest.Mock };
  let mockContextPipeline: { assembleContext: jest.Mock };
  let mockGeneration: { generateMilestones: jest.Mock };
  let mockGoalService: { findOne: jest.Mock; updateStatus: jest.Mock };
  let mockEventEmitter: { emit: jest.Mock };
  let mockRoadmapStorage: {
    getRoadmap: jest.Mock;
    getMilestones: jest.Mock;
    acquireGenerationLock: jest.Mock;
    storeMilestones: jest.Mock;
    updateRoadmapStatus: jest.Mock;
  };

  const userId = 'user-123';
  const goalId = 'goal-456';
  const roadmapId = 'roadmap-789';

  const mockGoal = {
    id: goalId,
    user_id: userId,
    title: 'Run a marathon',
    description: 'Complete a full marathon',
    status: 'intake_completed',
    target_date: '2026-08-01',
  };

  const mockContext: AssembledContext = {
    goalProfileSection: 'Profile',
    intakeSection: 'Intake',
    userProfileSection: 'User',
    progressSection: '',
    debriefSection: '',
    totalChunks: 5,
  };

  const mockMilestones = [
    {
      title: 'M1',
      description: 'D1',
      expected_outcome: 'O1',
      is_monthly_checkpoint: false,
      order_index: 1,
    },
    {
      title: 'M2',
      description: 'D2',
      expected_outcome: 'O2',
      is_monthly_checkpoint: false,
      order_index: 2,
    },
    {
      title: 'M3',
      description: 'D3',
      expected_outcome: 'O3',
      is_monthly_checkpoint: true,
      order_index: 3,
    },
  ];

  const mockGenerationResult = {
    milestones: mockMilestones,
    metadata: {
      model_used: 'test-model',
      latency_ms: 1000,
      context_chunks_used: 5,
      attempts: 1,
    },
  };

  const mockRoadmapRow = {
    id: roadmapId,
    goal_id: goalId,
    user_id: userId,
    status: 'complete',
    milestones: mockMilestones.map((m, i) => ({
      id: `ms-${i}`,
      roadmap_id: roadmapId,
      goal_id: goalId,
      ...m,
      created_at: '2026-02-22T00:00:00Z',
    })),
    current_milestone_id: 'ms-0',
    generation_metadata: {},
    quality_scores: null,
    created_at: '2026-02-22T00:00:00Z',
    updated_at: '2026-02-22T00:00:00Z',
  };

  beforeEach(async () => {
    mockSupabase = { from: jest.fn() };
    mockContextPipeline = { assembleContext: jest.fn() };
    mockGeneration = { generateMilestones: jest.fn() };
    mockGoalService = { findOne: jest.fn(), updateStatus: jest.fn() };
    mockEventEmitter = { emit: jest.fn() };
    mockRoadmapStorage = {
      getRoadmap: jest.fn(),
      getMilestones: jest.fn(),
      acquireGenerationLock: jest.fn(),
      storeMilestones: jest.fn(),
      updateRoadmapStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoadmapService,
        {
          provide: SupabaseService,
          useValue: { getAdminClient: (): typeof mockSupabase => mockSupabase },
        },
        { provide: ContextPipelineService, useValue: mockContextPipeline },
        { provide: GenerationService, useValue: mockGeneration },
        { provide: GoalService, useValue: mockGoalService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: RoadmapStorageService, useValue: mockRoadmapStorage },
        {
          provide: UserLanguageService,
          useValue: { getLanguage: jest.fn().mockResolvedValue('en') },
        },
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

    service = module.get<RoadmapService>(RoadmapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateMilestones', () => {
    const setupHappyPath = (): void => {
      mockGoalService.findOne.mockResolvedValue(mockGoal);
      mockContextPipeline.assembleContext.mockResolvedValue(mockContext);
      mockGeneration.generateMilestones.mockResolvedValue(mockGenerationResult);
      mockRoadmapStorage.acquireGenerationLock.mockResolvedValue({
        id: roadmapId,
      });
      mockRoadmapStorage.storeMilestones.mockResolvedValue(undefined);
      mockRoadmapStorage.updateRoadmapStatus.mockResolvedValue(undefined);
      mockRoadmapStorage.getRoadmap.mockResolvedValue(mockRoadmapRow);

      // goal_profiles fetch for user constraints
      const profileSingleMock = jest.fn().mockResolvedValue({
        data: {
          profile_data: {
            current_state: 'Beginner',
            constraints: 'Limited time',
          },
        },
        error: null,
      });
      const profileEq2Mock = jest
        .fn()
        .mockReturnValue({ single: profileSingleMock });
      const profileEq1Mock = jest.fn().mockReturnValue({ eq: profileEq2Mock });
      const profileSelectMock = jest
        .fn()
        .mockReturnValue({ eq: profileEq1Mock });
      mockSupabase.from.mockReturnValue({ select: profileSelectMock });
    };

    it('should complete happy path: lock, context, generate, store, complete, goal active, event', async () => {
      setupHappyPath();

      const result = await service.generateMilestones(goalId, userId);

      expect(mockGoalService.findOne).toHaveBeenCalledWith(userId, goalId);
      expect(mockRoadmapStorage.acquireGenerationLock).toHaveBeenCalledWith(
        goalId,
        userId,
      );
      expect(mockContextPipeline.assembleContext).toHaveBeenCalledWith(
        goalId,
        userId,
      );
      expect(mockGeneration.generateMilestones).toHaveBeenCalled();
      expect(mockRoadmapStorage.storeMilestones).toHaveBeenCalledWith(
        roadmapId,
        goalId,
        mockMilestones,
      );
      expect(mockRoadmapStorage.updateRoadmapStatus).toHaveBeenCalledWith(
        roadmapId,
        'complete',
        mockGenerationResult.metadata,
      );
      expect(mockGoalService.updateStatus).toHaveBeenCalledWith(
        goalId,
        'active',
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('roadmap.generated', {
        roadmapId,
        goalId,
      });
      expect(result).toBeDefined();
    });

    it('should throw 400 when goal status is not intake_completed or active', async () => {
      mockGoalService.findOne.mockResolvedValue({
        ...mockGoal,
        status: 'intake_in_progress',
      });

      await expect(service.generateMilestones(goalId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw 409 when roadmap is already generating', async () => {
      mockGoalService.findOne.mockResolvedValue(mockGoal);
      mockRoadmapStorage.acquireGenerationLock.mockRejectedValue(
        new ConflictException('Roadmap generation already in progress'),
      );

      await expect(service.generateMilestones(goalId, userId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw 400 when max retries exceeded', async () => {
      mockGoalService.findOne.mockResolvedValue(mockGoal);
      mockRoadmapStorage.acquireGenerationLock.mockRejectedValue(
        new BadRequestException('Maximum roadmap generation attempts exceeded'),
      );

      await expect(service.generateMilestones(goalId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update roadmap to failed on generation error', async () => {
      mockGoalService.findOne.mockResolvedValue(mockGoal);
      mockRoadmapStorage.acquireGenerationLock.mockResolvedValue({
        id: roadmapId,
      });
      mockContextPipeline.assembleContext.mockResolvedValue(mockContext);
      mockGeneration.generateMilestones.mockRejectedValue(
        new Error('Generation failed'),
      );
      mockRoadmapStorage.updateRoadmapStatus.mockResolvedValue(undefined);

      const profileSingleMock = jest.fn().mockResolvedValue({
        data: { profile_data: {} },
        error: null,
      });
      const profileEq2Mock = jest
        .fn()
        .mockReturnValue({ single: profileSingleMock });
      const profileEq1Mock = jest.fn().mockReturnValue({ eq: profileEq2Mock });
      const profileSelectMock = jest
        .fn()
        .mockReturnValue({ eq: profileEq1Mock });
      mockSupabase.from.mockReturnValue({ select: profileSelectMock });

      await expect(service.generateMilestones(goalId, userId)).rejects.toThrow(
        'Generation failed',
      );
      expect(mockRoadmapStorage.updateRoadmapStatus).toHaveBeenCalledWith(
        roadmapId,
        'failed',
        undefined,
      );
      expect(mockGoalService.updateStatus).not.toHaveBeenCalled();
    });

    it('should emit roadmap.generated event with correct payload', async () => {
      setupHappyPath();

      await service.generateMilestones(goalId, userId);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('roadmap.generated', {
        roadmapId,
        goalId,
      });
    });

    it('should pass generation metadata to storage', async () => {
      setupHappyPath();

      await service.generateMilestones(goalId, userId);

      expect(mockGeneration.generateMilestones).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({
          id: goalId,
          title: mockGoal.title,
          description: mockGoal.description,
        }),
        'en',
      );
      expect(mockGoalService.updateStatus).toHaveBeenCalledWith(
        goalId,
        'active',
      );
    });
  });

  describe('getRoadmap', () => {
    it('should delegate to roadmapStorage.getRoadmap', async () => {
      mockRoadmapStorage.getRoadmap.mockResolvedValue(mockRoadmapRow);

      const result = await service.getRoadmap(goalId, userId);

      expect(mockRoadmapStorage.getRoadmap).toHaveBeenCalledWith(
        goalId,
        userId,
      );
      expect(result).toEqual(mockRoadmapRow);
    });

    it('should throw NotFoundException when roadmap not found', async () => {
      mockRoadmapStorage.getRoadmap.mockRejectedValue(
        new NotFoundException('No roadmap found for this goal'),
      );

      await expect(service.getRoadmap(goalId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMilestones', () => {
    it('should delegate to roadmapStorage.getMilestones', async () => {
      const milestones = [
        { id: 'ms-1', order_index: 1, title: 'M1' },
        { id: 'ms-2', order_index: 2, title: 'M2' },
      ];
      mockRoadmapStorage.getMilestones.mockResolvedValue(milestones);

      const result = await service.getMilestones(goalId, userId);

      expect(mockRoadmapStorage.getMilestones).toHaveBeenCalledWith(
        goalId,
        userId,
      );
      expect(result).toHaveLength(2);
    });

    it('should throw NotFoundException when no roadmap exists', async () => {
      mockRoadmapStorage.getMilestones.mockRejectedValue(
        new NotFoundException('No roadmap found'),
      );

      await expect(service.getMilestones(goalId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
