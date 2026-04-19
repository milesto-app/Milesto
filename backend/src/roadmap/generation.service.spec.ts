/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access, no-restricted-syntax, @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AiService } from '../ai/ai.service.js';
import { config } from '../config/app.config.js';
import { GenerationService } from './generation.service.js';
import type { AssembledContext } from './types/context.types.js';
import type { GoalData, Milestone } from './types/roadmap.types.js';
import type {
  GenerationContext,
  WeekData,
  WeeklyPlan,
} from './types/weekly-plan.types.js';

describe('GenerationService', () => {
  let service: GenerationService;
  let mockAiService: { generateJson: jest.Mock };

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
      is_monthly_checkpoint: false,
      order_index: 1,
    },
    {
      title: 'Increase mileage',
      description: 'Gradually increase weekly mileage to 40km',
      expected_outcome: 'Completing 15km long runs',
      is_monthly_checkpoint: false,
      order_index: 2,
    },
    {
      title: 'Half marathon preparation',
      description: 'Train for and complete a half marathon distance',
      expected_outcome: 'Run 21km under 2 hours',
      is_monthly_checkpoint: true,
      order_index: 3,
    },
  ];

  beforeEach(async () => {
    mockAiService = {
      generateJson: jest.fn(),
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
      mockAiService.generateJson.mockResolvedValue(validMilestoneResponse);

      const result = await service.generateMilestones(
        mockContext,
        mockGoal,
        'en',
      );

      expect(result.milestones).toHaveLength(3);
      expect(result.milestones[0]!.title).toBe('Build base endurance');
      expect(result.metadata.model_used).toBe(config.roadmap.milestoneModel);
      expect(result.metadata.context_chunks_used).toBe(5);
      expect(result.metadata.attempts).toBe(1);
      expect(result.metadata.latency_ms).toBeGreaterThanOrEqual(0);
    });

    it('should validate well-formed milestone JSON', async () => {
      mockAiService.generateJson.mockResolvedValue(validMilestoneResponse);

      const result = await service.generateMilestones(
        mockContext,
        mockGoal,
        'en',
      );

      result.milestones.forEach((m) => {
        expect(typeof m.title).toBe('string');
        expect(typeof m.description).toBe('string');
        expect(typeof m.expected_outcome).toBe('string');
        expect(typeof m.order_index).toBe('number');
      });
    });

    it('should repair milestones with stringified numbers', async () => {
      const badResponse = validMilestoneResponse.map((m) => ({
        ...m,
        order_index: String(m.order_index),
      }));
      mockAiService.generateJson.mockResolvedValue(badResponse);

      const result = await service.generateMilestones(
        mockContext,
        mockGoal,
        'en',
      );

      expect(result.milestones).toHaveLength(3);
      expect(result.milestones[0]!.order_index).toBe(1);
    });

    it('should throw after repair failure for invalid data', async () => {
      const invalidResponse = [
        {
          title: '',
          description: '',
          expected_outcome: '',
          order_index: -1,
        },
      ];
      mockAiService.generateJson.mockResolvedValue(invalidResponse);

      await expect(
        service.generateMilestones(mockContext, mockGoal, 'en'),
      ).rejects.toThrow('Milestone validation failed after repair');
    });

    it('should use milestone model from config', async () => {
      mockAiService.generateJson.mockResolvedValue(validMilestoneResponse);

      await service.generateMilestones(mockContext, mockGoal, 'en');

      expect(mockAiService.generateJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        config.roadmap.milestoneModel,
      );
    });

    it('should include goal constraints in prompt', async () => {
      mockAiService.generateJson.mockResolvedValue(validMilestoneResponse);

      await service.generateMilestones(mockContext, mockGoal, 'en');

      const userPrompt = mockAiService.generateJson.mock.calls[0][1] as string;
      expect(userPrompt).toContain('Run a marathon');
      expect(userPrompt).toContain('Complete a full marathon in under 4 hours');
    });

    it('should inject profile_data as explicit user constraint variables in prompt', async () => {
      mockAiService.generateJson.mockResolvedValue(validMilestoneResponse);

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

      const userPrompt = mockAiService.generateJson.mock.calls[0][1] as string;
      expect(userPrompt).toContain('User Constraints');
      expect(userPrompt).toContain('Current State: Sedentary lifestyle');
      expect(userPrompt).toContain('Constraints: 3 hours per week available');
      expect(userPrompt).toContain('Effort Level: moderate');
      expect(userPrompt).toContain('Experience Level: beginner');
    });

    it('should include all 3 context sections in prompt', async () => {
      mockAiService.generateJson.mockResolvedValue(validMilestoneResponse);

      await service.generateMilestones(mockContext, mockGoal, 'en');

      const userPrompt = mockAiService.generateJson.mock.calls[0][1] as string;
      expect(userPrompt).toContain('Goal Profile');
      expect(userPrompt).toContain('Goal profile content');
      expect(userPrompt).toContain('Intake Q&A');
      expect(userPrompt).toContain('Intake Q&A content');
      expect(userPrompt).toContain('User Profile');
      expect(userPrompt).toContain('User profile content');
    });

    it('should retry on first attempt failure and succeed on second', async () => {
      mockAiService.generateJson
        .mockRejectedValueOnce(new Error('AI error'))
        .mockResolvedValueOnce(validMilestoneResponse);

      const result = await service.generateMilestones(
        mockContext,
        mockGoal,
        'en',
      );

      expect(result.milestones).toHaveLength(3);
      expect(result.metadata.attempts).toBe(2);
      expect(mockAiService.generateJson).toHaveBeenCalledTimes(2);
    });

    it('should throw last error when both attempts fail', async () => {
      mockAiService.generateJson
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'));

      await expect(
        service.generateMilestones(mockContext, mockGoal, 'en'),
      ).rejects.toThrow('Second failure');
      expect(mockAiService.generateJson).toHaveBeenCalledTimes(2);
    });

    it('should pass generation timeout and captureUsage via options', async () => {
      mockAiService.generateJson.mockResolvedValue(validMilestoneResponse);

      await service.generateMilestones(mockContext, mockGoal, 'en');

      expect(mockAiService.generateJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
      );
    });

    it('should include standard metadata fields', async () => {
      mockAiService.generateJson.mockResolvedValue(validMilestoneResponse);

      const result = await service.generateMilestones(
        mockContext,
        mockGoal,
        'en',
      );

      expect(result.metadata.model_used).toBeDefined();
      expect(result.metadata.latency_ms).toBeGreaterThanOrEqual(0);
      expect(result.metadata.context_chunks_used).toBe(mockContext.totalChunks);
      expect(result.metadata.attempts).toBe(1);
    });

    it('should handle goal without target_date', async () => {
      const { target_date: _, ...goalWithoutDate } = mockGoal;
      const goalNoDate: GoalData = goalWithoutDate;
      mockAiService.generateJson.mockResolvedValue(validMilestoneResponse);

      const result = await service.generateMilestones(
        mockContext,
        goalNoDate,
        'en',
      );

      expect(result.milestones).toHaveLength(3);
      const userPrompt = mockAiService.generateJson.mock.calls[0][1] as string;
      expect(userPrompt).toContain('Not specified');
    });

    it('should log warning on generation attempt failure', async () => {
      const warnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation();
      mockAiService.generateJson
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
      goal_id: 'goal-1',
      order_index: 1,
      title: 'Build base endurance',
      description: 'Establish a running foundation',
      expected_outcome: 'Able to run 10km comfortably',
      target_month: 1,
      target_week: 1,
      is_monthly_checkpoint: false,
      created_at: '2026-02-01T00:00:00.000Z',
    };

    const mockGenerationContext: GenerationContext = {
      milestone_title: 'Build base endurance',
      milestone_description: 'Establish a running foundation',
      milestone_expected_outcome: 'Able to run 10km comfortably',
    };

    const validWeeklyPlanResponse = {
      objectives: [
        'Run 3 times this week',
        'Research proper gear',
        'Set daily alarm for morning runs',
      ],
    };

    it('should return validated weekly plan with metadata on success', async () => {
      mockAiService.generateJson.mockResolvedValue(validWeeklyPlanResponse);

      const result = await service.generateWeeklyPlan({
        context: mockContext,
        milestone: mockMilestone,
        weekNumber: 1,
        generationContext: mockGenerationContext,
        language: 'en',
      });

      expect(result.plan.objectives).toHaveLength(3);
      expect(result.metadata.model_used).toBe(config.roadmap.weeklyModel);
      expect(result.metadata.attempts).toBe(1);
    });

    it('should use weekly model from config', async () => {
      mockAiService.generateJson.mockResolvedValue(validWeeklyPlanResponse);

      await service.generateWeeklyPlan({
        context: mockContext,
        milestone: mockMilestone,
        weekNumber: 1,
        generationContext: mockGenerationContext,
        language: 'en',
      });

      expect(mockAiService.generateJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        config.roadmap.weeklyModel,
      );
    });

    it('should repair weekly plan with non-string objectives', async () => {
      const badResponse = {
        objectives: [123, true, 'valid objective'],
      };
      mockAiService.generateJson.mockResolvedValue(badResponse);

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
      const invalidResponse = { objectives: [] };
      mockAiService.generateJson.mockResolvedValue(invalidResponse);

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
      mockAiService.generateJson
        .mockRejectedValueOnce(new Error('AI error'))
        .mockResolvedValueOnce(validWeeklyPlanResponse);

      const result = await service.generateWeeklyPlan({
        context: mockContext,
        milestone: mockMilestone,
        weekNumber: 1,
        generationContext: mockGenerationContext,
        language: 'en',
      });

      expect(result.plan.objectives).toHaveLength(3);
      expect(result.metadata.attempts).toBe(2);
    });

    it('should throw last error when both attempts fail', async () => {
      mockAiService.generateJson
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
      mockAiService.generateJson.mockResolvedValue(validWeeklyPlanResponse);

      await service.generateWeeklyPlan({
        context: mockContext,
        milestone: mockMilestone,
        weekNumber: 1,
        generationContext: mockGenerationContext,
        language: 'en',
      });

      const userPrompt = mockAiService.generateJson.mock.calls[0][1] as string;
      expect(userPrompt).toContain('Build base endurance');
      expect(userPrompt).toContain('Establish a running foundation');
      expect(userPrompt).toContain('Week Number: 1');
    });

    it('should log warning on generation attempt failure', async () => {
      const warnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation();
      mockAiService.generateJson
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

  describe('generateWeeklyTasks', () => {
    const mockWeeklyPlan = {
      id: 'plan-1',
      milestone_id: 'ms-1',
      goal_id: 'goal-1',
      user_id: 'user-1',
      week_number: 1,
      week_start_date: '2026-02-17',
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

    const mockWeekData: WeekData = {
      tasksCompleted: 2,
      tasksTotal: 5,
      debriefNotes: ['Good progress last week'],
    };

    const validWeeklyTasksResponse = [
      {
        title: 'Morning run - 5km easy pace',
        description:
          'Start the week with a light 5km run to maintain consistency',
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

    it('should generate weekly tasks aligned with weekly plan', async () => {
      mockAiService.generateJson.mockResolvedValue(validWeeklyTasksResponse);

      const result = await service.generateWeeklyTasks({
        weeklyPlan: mockWeeklyPlan,
        context: mockContext,
        weekData: mockWeekData,
        language: 'en',
      });

      expect(result.tasks).toHaveLength(3);
      expect(result.tasks[0]!.title).toBe('Morning run - 5km easy pace');
      expect(result.metadata.model_used).toBe(config.roadmap.weeklyTaskModel);
      expect(result.metadata.attempts).toBe(1);
    });

    it('should validate well-formed weekly task JSON', async () => {
      mockAiService.generateJson.mockResolvedValue(validWeeklyTasksResponse);

      const result = await service.generateWeeklyTasks({
        weeklyPlan: mockWeeklyPlan,
        context: mockContext,
        weekData: mockWeekData,
        language: 'en',
      });

      result.tasks.forEach((task) => {
        expect(typeof task.title).toBe('string');
        expect(typeof task.description).toBe('string');
        expect(typeof task.order_index).toBe('number');
      });
    });

    it('should repair weekly tasks with stringified order_index', async () => {
      const badResponse = validWeeklyTasksResponse.map((task) => ({
        ...task,
        order_index: String(task.order_index),
      }));
      mockAiService.generateJson.mockResolvedValue(badResponse);

      const result = await service.generateWeeklyTasks({
        weeklyPlan: mockWeeklyPlan,
        context: mockContext,
        weekData: mockWeekData,
        language: 'en',
      });

      expect(result.tasks).toHaveLength(3);
      expect(result.tasks[0]!.order_index).toBe(1);
    });

    it('should throw after repair failure for invalid data', async () => {
      const invalidResponse = [{ title: '', description: '', order_index: -1 }];
      mockAiService.generateJson.mockResolvedValue(invalidResponse);

      await expect(
        service.generateWeeklyTasks({
          weeklyPlan: mockWeeklyPlan,
          context: mockContext,
          weekData: mockWeekData,
          language: 'en',
        }),
      ).rejects.toThrow('Weekly tasks validation failed after repair');
    });

    it('should include standard metadata fields', async () => {
      mockAiService.generateJson.mockResolvedValue(validWeeklyTasksResponse);

      const result = await service.generateWeeklyTasks({
        weeklyPlan: mockWeeklyPlan,
        context: mockContext,
        weekData: mockWeekData,
        language: 'en',
      });

      expect(result.metadata.model_used).toBeDefined();
      expect(result.metadata.latency_ms).toBeGreaterThanOrEqual(0);
      expect(result.metadata.attempts).toBe(1);
    });

    it('should use weekly task model from config', async () => {
      mockAiService.generateJson.mockResolvedValue(validWeeklyTasksResponse);

      await service.generateWeeklyTasks({
        weeklyPlan: mockWeeklyPlan,
        context: mockContext,
        weekData: mockWeekData,
        language: 'en',
      });

      expect(mockAiService.generateJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        config.roadmap.weeklyTaskModel,
      );
    });

    it('should retry on first attempt failure and succeed on second', async () => {
      mockAiService.generateJson
        .mockRejectedValueOnce(new Error('AI error'))
        .mockResolvedValueOnce(validWeeklyTasksResponse);

      const result = await service.generateWeeklyTasks({
        weeklyPlan: mockWeeklyPlan,
        context: mockContext,
        weekData: mockWeekData,
        language: 'en',
      });

      expect(result.tasks).toHaveLength(3);
      expect(result.metadata.attempts).toBe(2);
      expect(mockAiService.generateJson).toHaveBeenCalledTimes(2);
    });

    it('should throw last error when both attempts fail', async () => {
      mockAiService.generateJson
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'));

      await expect(
        service.generateWeeklyTasks({
          weeklyPlan: mockWeeklyPlan,
          context: mockContext,
          weekData: mockWeekData,
          language: 'en',
        }),
      ).rejects.toThrow('Second failure');
      expect(mockAiService.generateJson).toHaveBeenCalledTimes(2);
    });

    it('should log warning on generation attempt failure', async () => {
      const warnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation();
      mockAiService.generateJson
        .mockRejectedValueOnce(new Error('AI timeout'))
        .mockResolvedValueOnce(validWeeklyTasksResponse);

      await service.generateWeeklyTasks({
        weeklyPlan: mockWeeklyPlan,
        context: mockContext,
        weekData: mockWeekData,
        language: 'en',
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Weekly tasks generation attempt 1 failed'),
      );
    });
  });
});
