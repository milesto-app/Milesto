import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AiService } from '../ai/ai.service.js';
import { GenerationNarrativeService } from './generation-narrative.service.js';
import type { WeekData, WeeklyPlan } from './types/weekly-plan.types.js';

describe('GenerationNarrativeService', () => {
  let service: GenerationNarrativeService;
  let mockAiService: { generateJson: jest.Mock };

  beforeEach(async () => {
    mockAiService = {
      generateJson: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerationNarrativeService,
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get<GenerationNarrativeService>(
      GenerationNarrativeService,
    );
  });

  describe('generateWeeklySummary', () => {
    const completedPlan = {
      id: 'plan-1',
      milestone_id: 'ms-1',
      goal_id: 'goal-1',
      user_id: 'user-1',
      week_number: 1,
      week_start_date: '2026-02-17',
      objectives: ['Obj 1', 'Obj 2', 'Obj 3'],
      generation_context: {},
      summary: null,
      status: 'completed' as const,
      is_fallback: false,
      model_used: null,
      generation_metadata: {},
      quality_scores: null,
      created_at: '2026-02-17T00:00:00.000Z',
    } satisfies WeeklyPlan;

    const emptyWeekData: WeekData = {
      tasksCompleted: 0,
      tasksTotal: 0,
      debriefNotes: [],
    };

    it('should return computed data with zero completions', async () => {
      const result = await service.generateWeeklySummary(
        completedPlan,
        emptyWeekData,
        'en',
      );

      expect(result.completion_rate).toBe(0);
      expect(result.tasks_completed).toBe(0);
      expect(result.tasks_total).toBe(3);
      expect(result.debrief_count).toBe(0);
      expect(result.narrative).toBeUndefined();
    });

    it('should compute correct completion rate', async () => {
      const weekData: WeekData = {
        tasksCompleted: 3,
        tasksTotal: 4,
        debriefNotes: [],
      };

      const result = await service.generateWeeklySummary(
        completedPlan,
        weekData,
        'en',
      );

      expect(result.completion_rate).toBe(75);
      expect(result.tasks_completed).toBe(3);
      expect(result.tasks_total).toBe(4);
    });

    it('should include debrief count', async () => {
      const weekData: WeekData = {
        tasksCompleted: 0,
        tasksTotal: 0,
        debriefNotes: ['Week went well', 'Struggled with focus'],
      };
      mockAiService.generateJson.mockResolvedValue({
        narrative: 'Good progress',
      });

      const result = await service.generateWeeklySummary(
        completedPlan,
        weekData,
        'en',
      );

      expect(result.debrief_count).toBe(2);
    });

    it('should generate LLM narrative when debrief notes exist', async () => {
      const weekData: WeekData = {
        tasksCompleted: 3,
        tasksTotal: 4,
        debriefNotes: ['Great week', 'Tough but productive'],
      };
      mockAiService.generateJson.mockResolvedValue({
        narrative: 'Good progress this week with consistent effort.',
      });

      const result = await service.generateWeeklySummary(
        completedPlan,
        weekData,
        'en',
      );

      expect(result.narrative).toBe(
        'Good progress this week with consistent effort.',
      );
      expect(mockAiService.generateJson).toHaveBeenCalledWith(
        expect.stringContaining('coaching progress analyst'),
        expect.stringContaining('Debrief Notes'),
        expect.any(String),
      );
    });

    it('should return summary without narrative when no debriefs exist', async () => {
      const result = await service.generateWeeklySummary(
        completedPlan,
        emptyWeekData,
        'en',
      );

      expect(result.narrative).toBeUndefined();
      expect(mockAiService.generateJson).not.toHaveBeenCalled();
    });

    it('should handle LLM narrative generation failure gracefully', async () => {
      const weekData: WeekData = {
        tasksCompleted: 2,
        tasksTotal: 5,
        debriefNotes: ['Some note'],
      };
      mockAiService.generateJson.mockRejectedValue(new Error('LLM timeout'));
      const warnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation();

      const result = await service.generateWeeklySummary(
        completedPlan,
        weekData,
        'en',
      );

      expect(result.completion_rate).toBe(40);
      expect(result.tasks_completed).toBe(2);
      expect(result.narrative).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Weekly summary narrative generation failed'),
      );
    });
  });

  describe('generateMonthlySummary', () => {
    it('should aggregate multiple weekly summaries into monthly totals', async () => {
      const weeklySummaries = [
        {
          completion_rate: 80,
          tasks_completed: 4,
          tasks_total: 5,
          debrief_count: 2,
        },
        {
          completion_rate: 60,
          tasks_completed: 3,
          tasks_total: 5,
          debrief_count: 1,
        },
      ];

      const result = await service.generateMonthlySummary(
        weeklySummaries,
        'en',
      );

      expect(result.tasks_completed).toBe(7);
      expect(result.tasks_total).toBe(10);
      expect(result.debrief_count).toBe(3);
    });

    it('should compute average completion rate across weeks', async () => {
      const weeklySummaries = [
        { completion_rate: 80, tasks_completed: 4, tasks_total: 5 },
        { completion_rate: 60, tasks_completed: 3, tasks_total: 5 },
      ];

      const result = await service.generateMonthlySummary(
        weeklySummaries,
        'en',
      );

      expect(result.completion_rate).toBe(70);
    });

    it('should generate LLM narrative when weekly narratives exist', async () => {
      const weeklySummaries = [
        {
          completion_rate: 80,
          tasks_completed: 4,
          tasks_total: 5,
          narrative: 'Great week',
        },
        {
          completion_rate: 60,
          tasks_completed: 3,
          tasks_total: 5,
          narrative: 'Slower week',
        },
      ];
      mockAiService.generateJson.mockResolvedValue({
        narrative: 'Consistent month overall',
      });

      const result = await service.generateMonthlySummary(
        weeklySummaries,
        'en',
      );

      expect(result.narrative).toBe('Consistent month overall');
      expect(mockAiService.generateJson).toHaveBeenCalledWith(
        expect.stringContaining('coaching progress analyst'),
        expect.stringContaining('Weekly Narratives'),
        expect.any(String),
      );
    });

    it('should return computed-only summary when no weekly narratives', async () => {
      const weeklySummaries = [
        { completion_rate: 80, tasks_completed: 4, tasks_total: 5 },
      ];

      const result = await service.generateMonthlySummary(
        weeklySummaries,
        'en',
      );

      expect(result.narrative).toBeUndefined();
      expect(mockAiService.generateJson).not.toHaveBeenCalled();
    });

    it('should handle empty weekly summary array', async () => {
      const result = await service.generateMonthlySummary([], 'en');

      expect(result.completion_rate).toBe(0);
      expect(result.tasks_completed).toBe(0);
      expect(result.tasks_total).toBe(0);
      expect(result.debrief_count).toBe(0);
    });

    it('should handle monthly narrative generation failure gracefully', async () => {
      const weeklySummaries = [
        {
          completion_rate: 80,
          tasks_completed: 4,
          tasks_total: 5,
          narrative: 'Good week',
        },
      ];
      mockAiService.generateJson.mockRejectedValue(new Error('LLM error'));
      const warnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation();

      const result = await service.generateMonthlySummary(
        weeklySummaries,
        'en',
      );

      expect(result.completion_rate).toBe(80);
      expect(result.narrative).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Monthly summary narrative generation failed'),
      );
    });
  });
});
