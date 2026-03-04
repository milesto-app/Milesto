/* eslint-disable max-params, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await, @typescript-eslint/no-unnecessary-condition, no-restricted-syntax, @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AiService } from '../ai/ai.service.js';
import { appConfig } from '../config/app.config.js';
import { GenerationService } from './generation.service.js';
import type { AssembledContext } from './types/context.types.js';
import type { EnergyLevel } from './types/daily.types.js';
import type { GoalData, Milestone } from './types/roadmap.types.js';
import type {
  GenerationContext,
  WeeklyPlan,
} from './types/weekly-plan.types.js';

describe('GenerationService', () => {
  let service: GenerationService;
  let mockAiService: { generateJSON: jest.Mock };

  const mockContext: AssembledContext = {
    goalProfileSection: 'Goal profile content',
    intakeSection: 'Intake Q&A content',
    userProfileSection: 'User profile content',
    progressSection: '',
    debriefSection: '',
    totalChunks: 5,
  };

  const mockGoal: GoalData = {
    id: 'goal-123',
    title: 'Run a marathon',
    description: 'Complete a full marathon in under 4 hours',
    target_date: new Date(
      Date.now() + 6 * 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    status: 'intake_completed',
  };

  const validMilestoneResponse = [
    {
      title: 'Build base endurance',
      description: 'Establish a running foundation with 3-4 runs per week',
      expected_outcome: 'Able to run 10km comfortably',
      target_month: 1,
      order_index: 1,
    },
    {
      title: 'Increase mileage',
      description: 'Gradually increase weekly mileage to 40km',
      expected_outcome: 'Completing 15km long runs',
      target_month: 2,
      order_index: 2,
    },
    {
      title: 'Half marathon preparation',
      description: 'Train for and complete a half marathon distance',
      expected_outcome: 'Run 21km under 2 hours',
      target_month: 3,
      order_index: 3,
    },
  ];

  beforeEach(async () => {
    mockAiService = {
      generateJSON: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerationService,
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get<GenerationService>(GenerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateMilestones', () => {
    it('should return validated milestones with metadata on success', async () => {
      mockAiService.generateJSON.mockResolvedValue(validMilestoneResponse);

      const result = await service.generateMilestones(
        mockContext,
        mockGoal,
        'en',
      );

      expect(result.milestones).toHaveLength(3);
      expect(result.milestones[0]!.title).toBe('Build base endurance');
      expect(result.metadata.model_used).toBe(appConfig.ai.defaultModel);
      expect(result.metadata.context_chunks_used).toBe(5);
      expect(result.metadata.attempts).toBe(1);
      expect(result.metadata.latency_ms).toBeGreaterThanOrEqual(0);
    });

    it('should validate well-formed milestone JSON', async () => {
      mockAiService.generateJSON.mockResolvedValue(validMilestoneResponse);

      const result = await service.generateMilestones(
        mockContext,
        mockGoal,
        'en',
      );

      result.milestones.forEach((m) => {
        expect(typeof m.title).toBe('string');
        expect(typeof m.description).toBe('string');
        expect(typeof m.expected_outcome).toBe('string');
        expect(typeof m.target_month).toBe('number');
        expect(typeof m.order_index).toBe('number');
      });
    });

    it('should repair milestones with stringified numbers', async () => {
      const badResponse = validMilestoneResponse.map((m) => ({
        ...m,
        target_month: String(m.target_month),
        order_index: String(m.order_index),
      }));
      mockAiService.generateJSON.mockResolvedValue(badResponse);

      const result = await service.generateMilestones(
        mockContext,
        mockGoal,
        'en',
      );

      expect(result.milestones).toHaveLength(3);
      expect(result.milestones[0]!.target_month).toBe(1);
      expect(result.milestones[0]!.order_index).toBe(1);
    });

    it('should throw after repair failure for invalid data', async () => {
      const invalidResponse = [
        {
          title: '',
          description: '',
          expected_outcome: '',
          target_month: 'not-a-number',
          order_index: -1,
        },
      ];
      mockAiService.generateJSON.mockResolvedValue(invalidResponse);

      await expect(
        service.generateMilestones(mockContext, mockGoal, 'en'),
      ).rejects.toThrow('Milestone validation failed after repair');
    });

    it('should resolve milestone model from default to appConfig.ai.defaultModel', async () => {
      mockAiService.generateJSON.mockResolvedValue(validMilestoneResponse);

      await service.generateMilestones(mockContext, mockGoal, 'en');

      expect(mockAiService.generateJSON).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        appConfig.ai.defaultModel,
        expect.objectContaining({
          timeoutMs: appConfig.roadmap.generationTimeoutMs,
        }),
      );
    });

    it('should include goal constraints in prompt', async () => {
      mockAiService.generateJSON.mockResolvedValue(validMilestoneResponse);

      await service.generateMilestones(mockContext, mockGoal, 'en');

      const userPrompt = mockAiService.generateJSON.mock.calls[0][1] as string;
      expect(userPrompt).toContain('Run a marathon');
      expect(userPrompt).toContain('Complete a full marathon in under 4 hours');
    });

    it('should inject profile_data as explicit user constraint variables in prompt', async () => {
      mockAiService.generateJSON.mockResolvedValue(validMilestoneResponse);

      const goalWithProfile: GoalData = {
        ...mockGoal,
        profile_data: {
          current_state: 'Sedentary lifestyle',
          desired_state: 'Marathon runner',
          constraints: '3 hours per week available',
          effort_level: 'moderate',
          experience_level: 'beginner',
        },
      };

      await service.generateMilestones(mockContext, goalWithProfile, 'en');

      const userPrompt = mockAiService.generateJSON.mock.calls[0][1] as string;
      expect(userPrompt).toContain('User Constraints');
      expect(userPrompt).toContain('Current State: Sedentary lifestyle');
      expect(userPrompt).toContain('Constraints: 3 hours per week available');
      expect(userPrompt).toContain('Effort Level: moderate');
      expect(userPrompt).toContain('Experience Level: beginner');
    });

    it('should include all 3 context sections in prompt', async () => {
      mockAiService.generateJSON.mockResolvedValue(validMilestoneResponse);

      await service.generateMilestones(mockContext, mockGoal, 'en');

      const userPrompt = mockAiService.generateJSON.mock.calls[0][1] as string;
      expect(userPrompt).toContain('Goal Profile');
      expect(userPrompt).toContain('Goal profile content');
      expect(userPrompt).toContain('Intake Q&A');
      expect(userPrompt).toContain('Intake Q&A content');
      expect(userPrompt).toContain('User Profile');
      expect(userPrompt).toContain('User profile content');
    });

    it('should retry on first attempt failure and succeed on second', async () => {
      mockAiService.generateJSON
        .mockRejectedValueOnce(new Error('AI error'))
        .mockResolvedValueOnce(validMilestoneResponse);

      const result = await service.generateMilestones(
        mockContext,
        mockGoal,
        'en',
      );

      expect(result.milestones).toHaveLength(3);
      expect(result.metadata.attempts).toBe(2);
      expect(mockAiService.generateJSON).toHaveBeenCalledTimes(2);
    });

    it('should throw last error when both attempts fail', async () => {
      mockAiService.generateJSON
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'));

      await expect(
        service.generateMilestones(mockContext, mockGoal, 'en'),
      ).rejects.toThrow('Second failure');
      expect(mockAiService.generateJSON).toHaveBeenCalledTimes(2);
    });

    it('should pass generation timeout and captureUsage via options', async () => {
      mockAiService.generateJSON.mockResolvedValue(validMilestoneResponse);

      await service.generateMilestones(mockContext, mockGoal, 'en');

      expect(mockAiService.generateJSON).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          timeoutMs: appConfig.roadmap.generationTimeoutMs,
          captureUsage: expect.any(Object),
        }),
      );
    });

    it('should include token usage in metadata when available', async () => {
      mockAiService.generateJSON.mockImplementation(
        async (
          _sys: string,
          _user: string,
          _model: string,
          options: { captureUsage?: Record<string, number> },
        ) => {
          if (options?.captureUsage) {
            options.captureUsage.prompt_tokens = 150;
            options.captureUsage.completion_tokens = 200;
            options.captureUsage.total_tokens = 350;
          }
          return validMilestoneResponse;
        },
      );

      const result = await service.generateMilestones(
        mockContext,
        mockGoal,
        'en',
      );

      expect(result.metadata.prompt_tokens).toBe(150);
      expect(result.metadata.completion_tokens).toBe(200);
    });

    it('should handle goal without target_date', async () => {
      const { target_date: _, ...goalWithoutDate } = mockGoal;
      const goalNoDate: GoalData = goalWithoutDate;
      mockAiService.generateJSON.mockResolvedValue(validMilestoneResponse);

      const result = await service.generateMilestones(
        mockContext,
        goalNoDate,
        'en',
      );

      expect(result.milestones).toHaveLength(3);
      const userPrompt = mockAiService.generateJSON.mock.calls[0][1] as string;
      expect(userPrompt).toContain('Not specified');
    });

    it('should log warning on generation attempt failure', async () => {
      const warnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation();
      mockAiService.generateJSON
        .mockRejectedValueOnce(new Error('AI timeout'))
        .mockResolvedValueOnce(validMilestoneResponse);

      await service.generateMilestones(mockContext, mockGoal, 'en');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Milestone generation attempt 1 failed'),
      );
    });
  });

  describe('generateWeeklyPlan', () => {
    const mockMilestone: Milestone = {
      id: 'ms-1',
      roadmap_id: 'roadmap-1',
      goal_id: 'goal-1',
      order_index: 1,
      title: 'Build base endurance',
      description: 'Establish a running foundation',
      expected_outcome: 'Able to run 10km comfortably',
      target_month: 1,
      created_at: '2026-02-01T00:00:00.000Z',
    };

    const mockGenerationContext: GenerationContext = {
      milestone_title: 'Build base endurance',
      milestone_description: 'Establish a running foundation',
      milestone_expected_outcome: 'Able to run 10km comfortably',
      milestone_target_month: 1,
    };

    const validWeeklyPlanResponse = {
      focus: 'Build foundation habits',
      objectives: [
        'Run 3 times this week',
        'Research proper gear',
        'Set daily alarm for morning runs',
      ],
    };

    it('should return validated weekly plan with metadata on success', async () => {
      mockAiService.generateJSON.mockResolvedValue(validWeeklyPlanResponse);

      const result = await service.generateWeeklyPlan({
        context: mockContext,
        milestone: mockMilestone,
        weekNumber: 1,
        generationContext: mockGenerationContext,
        language: 'en',
      });

      expect(result.plan.focus).toBe('Build foundation habits');
      expect(result.plan.objectives).toHaveLength(3);
      expect(result.metadata.model_used).toBe(appConfig.ai.defaultModel);
      expect(result.metadata.attempts).toBe(1);
    });

    it('should use weeklyPlanTimeoutMs from config', async () => {
      mockAiService.generateJSON.mockResolvedValue(validWeeklyPlanResponse);

      await service.generateWeeklyPlan({
        context: mockContext,
        milestone: mockMilestone,
        weekNumber: 1,
        generationContext: mockGenerationContext,
        language: 'en',
      });

      expect(mockAiService.generateJSON).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        appConfig.ai.defaultModel,
        expect.objectContaining({
          timeoutMs: appConfig.roadmap.weeklyPlanTimeoutMs,
        }),
      );
    });

    it('should repair weekly plan with non-string objectives', async () => {
      const badResponse = {
        focus: 'Focus text',
        objectives: [123, true, 'valid objective'],
      };
      mockAiService.generateJSON.mockResolvedValue(badResponse);

      const result = await service.generateWeeklyPlan({
        context: mockContext,
        milestone: mockMilestone,
        weekNumber: 1,
        generationContext: mockGenerationContext,
        language: 'en',
      });

      expect(result.plan.objectives).toEqual([
        '123',
        'true',
        'valid objective',
      ]);
    });

    it('should throw on double validation failure', async () => {
      const invalidResponse = { focus: '', objectives: [] };
      mockAiService.generateJSON.mockResolvedValue(invalidResponse);

      await expect(
        service.generateWeeklyPlan({
          context: mockContext,
          milestone: mockMilestone,
          weekNumber: 1,
          generationContext: mockGenerationContext,
        }),
      ).rejects.toThrow('Weekly plan validation failed after repair');
    });

    it('should retry on first attempt failure and succeed on second', async () => {
      mockAiService.generateJSON
        .mockRejectedValueOnce(new Error('AI error'))
        .mockResolvedValueOnce(validWeeklyPlanResponse);

      const result = await service.generateWeeklyPlan({
        context: mockContext,
        milestone: mockMilestone,
        weekNumber: 1,
        generationContext: mockGenerationContext,
        language: 'en',
      });

      expect(result.plan.focus).toBe('Build foundation habits');
      expect(result.metadata.attempts).toBe(2);
    });

    it('should throw last error when both attempts fail', async () => {
      mockAiService.generateJSON
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'));

      await expect(
        service.generateWeeklyPlan({
          context: mockContext,
          milestone: mockMilestone,
          weekNumber: 1,
          generationContext: mockGenerationContext,
        }),
      ).rejects.toThrow('Second failure');
    });

    it('should include milestone context in prompt', async () => {
      mockAiService.generateJSON.mockResolvedValue(validWeeklyPlanResponse);

      await service.generateWeeklyPlan({
        context: mockContext,
        milestone: mockMilestone,
        weekNumber: 1,
        generationContext: mockGenerationContext,
        language: 'en',
      });

      const userPrompt = mockAiService.generateJSON.mock.calls[0][1] as string;
      expect(userPrompt).toContain('Build base endurance');
      expect(userPrompt).toContain('Establish a running foundation');
      expect(userPrompt).toContain('Week Number: 1');
    });

    it('should log warning on generation attempt failure', async () => {
      const warnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation();
      mockAiService.generateJSON
        .mockRejectedValueOnce(new Error('AI timeout'))
        .mockResolvedValueOnce(validWeeklyPlanResponse);

      await service.generateWeeklyPlan({
        context: mockContext,
        milestone: mockMilestone,
        weekNumber: 1,
        generationContext: mockGenerationContext,
        language: 'en',
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Weekly plan generation attempt 1 failed'),
      );
    });
  });

  describe('generateDailyObjectives', () => {
    const mockWeeklyPlan = {
      id: 'plan-1',
      roadmap_id: 'roadmap-1',
      milestone_id: 'ms-1',
      goal_id: 'goal-1',
      user_id: 'user-1',
      week_number: 1,
      week_start_date: '2026-02-17',
      focus: 'Build foundation habits',
      objectives: ['Run 3 times', 'Research gear', 'Set daily alarm'],
      generation_context: {},
      summary: null,
      status: 'active' as const,
      is_fallback: false,
      model_used: null,
      generation_metadata: {},
      quality_scores: null,
      created_at: '2026-02-17T00:00:00.000Z',
    } satisfies WeeklyPlan;

    const mockWeekData = {
      completedObjectives: 2,
      totalObjectives: 5,
      debriefNotes: ['Good progress yesterday'],
    };

    const validDailyObjectivesResponse = [
      {
        title: 'Morning run - 5km easy pace',
        description:
          'Start the day with a light 5km run to maintain consistency',
        order_index: 1,
        difficulty_rating: 'easy',
      },
      {
        title: 'Research running shoes',
        description: 'Compare top 3 running shoe models for your foot type',
        order_index: 2,
        difficulty_rating: 'moderate',
      },
      {
        title: 'Plan weekly meal prep',
        description: 'Create a nutrition plan to support your training goals',
        order_index: 3,
        difficulty_rating: 'moderate',
      },
    ];

    it('should generate daily objectives with energy calibration', async () => {
      mockAiService.generateJSON.mockResolvedValue(
        validDailyObjectivesResponse,
      );

      const result = await service.generateDailyObjectives({
        weeklyPlan: mockWeeklyPlan,
        energyLevel: 'good' as EnergyLevel,
        context: mockContext,
        weekData: mockWeekData,
        language: 'en',
      });

      expect(result.objectives).toHaveLength(3);
      expect(result.objectives[0]!.title).toBe('Morning run - 5km easy pace');
      expect(result.metadata.model_used).toBe(appConfig.ai.defaultModel);
      expect(result.metadata.attempts).toBe(1);
    });

    it('should validate well-formed daily objective JSON', async () => {
      mockAiService.generateJSON.mockResolvedValue(
        validDailyObjectivesResponse,
      );

      const result = await service.generateDailyObjectives({
        weeklyPlan: mockWeeklyPlan,
        energyLevel: 'high' as EnergyLevel,
        context: mockContext,
        weekData: mockWeekData,
        language: 'en',
      });

      result.objectives.forEach((obj) => {
        expect(typeof obj.title).toBe('string');
        expect(typeof obj.description).toBe('string');
        expect(typeof obj.order_index).toBe('number');
      });
    });

    it('should repair daily objectives with stringified order_index', async () => {
      const badResponse = validDailyObjectivesResponse.map((obj) => ({
        ...obj,
        order_index: String(obj.order_index),
      }));
      mockAiService.generateJSON.mockResolvedValue(badResponse);

      const result = await service.generateDailyObjectives({
        weeklyPlan: mockWeeklyPlan,
        energyLevel: 'good' as EnergyLevel,
        context: mockContext,
        weekData: mockWeekData,
        language: 'en',
      });

      expect(result.objectives).toHaveLength(3);
      expect(result.objectives[0]!.order_index).toBe(1);
    });

    it('should throw after repair failure for invalid data', async () => {
      const invalidResponse = [{ title: '', description: '', order_index: -1 }];
      mockAiService.generateJSON.mockResolvedValue(invalidResponse);

      await expect(
        service.generateDailyObjectives({
          weeklyPlan: mockWeeklyPlan,
          energyLevel: 'good' as EnergyLevel,
          context: mockContext,
          weekData: mockWeekData,
        }),
      ).rejects.toThrow('Daily objectives validation failed after repair');
    });

    it('should include token usage in metadata', async () => {
      mockAiService.generateJSON.mockImplementation(
        async (
          _sys: string,
          _user: string,
          _model: string,
          options: { captureUsage?: Record<string, number> },
        ) => {
          if (options?.captureUsage) {
            options.captureUsage.prompt_tokens = 100;
            options.captureUsage.completion_tokens = 150;
          }
          return validDailyObjectivesResponse;
        },
      );

      const result = await service.generateDailyObjectives({
        weeklyPlan: mockWeeklyPlan,
        energyLevel: 'good' as EnergyLevel,
        context: mockContext,
        weekData: mockWeekData,
        language: 'en',
      });

      expect(result.metadata.prompt_tokens).toBe(100);
      expect(result.metadata.completion_tokens).toBe(150);
    });

    it('should use dailyObjectiveTimeoutMs from config', async () => {
      mockAiService.generateJSON.mockResolvedValue(
        validDailyObjectivesResponse,
      );

      await service.generateDailyObjectives({
        weeklyPlan: mockWeeklyPlan,
        energyLevel: 'good' as EnergyLevel,
        context: mockContext,
        weekData: mockWeekData,
        language: 'en',
      });

      expect(mockAiService.generateJSON).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        appConfig.ai.defaultModel,
        expect.objectContaining({
          timeoutMs: appConfig.roadmap.dailyObjectiveTimeoutMs,
        }),
      );
    });

    it('should retry on first attempt failure and succeed on second', async () => {
      mockAiService.generateJSON
        .mockRejectedValueOnce(new Error('AI error'))
        .mockResolvedValueOnce(validDailyObjectivesResponse);

      const result = await service.generateDailyObjectives({
        weeklyPlan: mockWeeklyPlan,
        energyLevel: 'low' as EnergyLevel,
        context: mockContext,
        weekData: mockWeekData,
        language: 'en',
      });

      expect(result.objectives).toHaveLength(3);
      expect(result.metadata.attempts).toBe(2);
      expect(mockAiService.generateJSON).toHaveBeenCalledTimes(2);
    });

    it('should throw last error when both attempts fail', async () => {
      mockAiService.generateJSON
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'));

      await expect(
        service.generateDailyObjectives({
          weeklyPlan: mockWeeklyPlan,
          energyLevel: 'good' as EnergyLevel,
          context: mockContext,
          weekData: mockWeekData,
        }),
      ).rejects.toThrow('Second failure');
      expect(mockAiService.generateJSON).toHaveBeenCalledTimes(2);
    });

    it('should include energy level in prompt', async () => {
      mockAiService.generateJSON.mockResolvedValue(
        validDailyObjectivesResponse,
      );

      await service.generateDailyObjectives({
        weeklyPlan: mockWeeklyPlan,
        energyLevel: 'low' as EnergyLevel,
        context: mockContext,
        weekData: mockWeekData,
        language: 'en',
      });

      const userPrompt = mockAiService.generateJSON.mock.calls[0][1] as string;
      expect(userPrompt).toContain('Energy: low');
    });

    it('should include weekly plan focus in prompt', async () => {
      mockAiService.generateJSON.mockResolvedValue(
        validDailyObjectivesResponse,
      );

      await service.generateDailyObjectives({
        weeklyPlan: mockWeeklyPlan,
        energyLevel: 'good' as EnergyLevel,
        context: mockContext,
        weekData: mockWeekData,
        language: 'en',
      });

      const userPrompt = mockAiService.generateJSON.mock.calls[0][1] as string;
      expect(userPrompt).toContain('Build foundation habits');
    });

    it('should include energy calibration rules in system prompt', async () => {
      mockAiService.generateJSON.mockResolvedValue(
        validDailyObjectivesResponse,
      );

      await service.generateDailyObjectives({
        weeklyPlan: mockWeeklyPlan,
        energyLevel: 'high' as EnergyLevel,
        context: mockContext,
        weekData: mockWeekData,
        language: 'en',
      });

      const systemPrompt = mockAiService.generateJSON.mock
        .calls[0][0] as string;
      expect(systemPrompt).toContain('4-6 objectives');
      expect(systemPrompt).toContain('2-3 objectives');
    });

    it('should log warning on generation attempt failure', async () => {
      const warnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation();
      mockAiService.generateJSON
        .mockRejectedValueOnce(new Error('AI timeout'))
        .mockResolvedValueOnce(validDailyObjectivesResponse);

      await service.generateDailyObjectives({
        weeklyPlan: mockWeeklyPlan,
        energyLevel: 'good' as EnergyLevel,
        context: mockContext,
        weekData: mockWeekData,
        language: 'en',
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Daily objectives generation attempt 1 failed'),
      );
    });
  });
});
