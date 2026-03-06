/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AiService } from '../ai/ai.service.js';
import { config } from '../config/app.config.js';
import { IntakePromptService } from './intake-prompt.service.js';

describe('IntakePromptService', () => {
  let service: IntakePromptService;
  let mockAiService: { generateJson: jest.Mock };

  beforeEach(async () => {
    mockAiService = { generateJson: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntakePromptService,
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get<IntakePromptService>(IntakePromptService);
  });

  describe('getUniversalBatch', () => {
    it('should return exactly 5 questions', () => {
      const questions = service.getUniversalBatch('en');
      expect(questions).toHaveLength(5);
    });

    it('should include at least one text type question', () => {
      const questions = service.getUniversalBatch('en');
      const textQuestions = questions.filter((q) => q.question_type === 'text');
      expect(textQuestions.length).toBeGreaterThanOrEqual(1);
    });

    it('should include at least one scale type question', () => {
      const questions = service.getUniversalBatch('en');
      const scaleQuestions = questions.filter(
        (q) => q.question_type === 'scale',
      );
      expect(scaleQuestions.length).toBeGreaterThanOrEqual(1);
    });

    it('should include at least one single_choice type question', () => {
      const questions = service.getUniversalBatch('en');
      const choiceQuestions = questions.filter(
        (q) => q.question_type === 'single_choice',
      );
      expect(choiceQuestions.length).toBeGreaterThanOrEqual(1);
    });

    it('should have question_text, question_type, config, and order_in_batch on each question', () => {
      const questions = service.getUniversalBatch('en');
      for (const q of questions) {
        expect(q).toHaveProperty('question_text');
        expect(q).toHaveProperty('question_type');
        expect(q).toHaveProperty('config');
        expect(q).toHaveProperty('order_in_batch');
      }
    });

    it('should have min, max, min_label, max_label in config for scale questions', () => {
      const questions = service.getUniversalBatch('en');
      const scaleQuestions = questions.filter(
        (q) => q.question_type === 'scale',
      );
      for (const q of scaleQuestions) {
        expect(q.config).toHaveProperty('min');
        expect(q.config).toHaveProperty('max');
        expect(q.config).toHaveProperty('min_label');
        expect(q.config).toHaveProperty('max_label');
      }
    });

    it('should have non-empty options array in config for single_choice questions', () => {
      const questions = service.getUniversalBatch('en');
      const choiceQuestions = questions.filter(
        (q) => q.question_type === 'single_choice',
      );
      for (const q of choiceQuestions) {
        expect(q.config).toHaveProperty('options');
        expect(Array.isArray((q.config as { options: string[] }).options)).toBe(
          true,
        );
        expect(
          (q.config as { options: string[] }).options.length,
        ).toBeGreaterThan(0);
      }
    });

    it('should have sequential order_in_batch values 1-5', () => {
      const questions = service.getUniversalBatch('en');
      const orders = questions.map((q) => q.order_in_batch);
      expect(orders).toEqual([1, 2, 3, 4, 5]);
    });

    it('should have question 4 as text type with config.format === "date"', () => {
      const questions = service.getUniversalBatch('en');
      const q4 = questions.find((q) => q.order_in_batch === 4);
      expect(q4).toBeDefined();
      expect(q4?.question_type).toBe('text');
      expect(q4?.config).toEqual({ format: 'date' });
    });
  });

  describe('generateGoalProfile', () => {
    const priorBatches = [
      {
        batch_number: 1,
        questions: [
          {
            question_text: 'What motivated you?',
            question_type: 'text',
            answer: 'To get healthy',
          },
          {
            question_text: 'Hours per week?',
            question_type: 'scale',
            answer: '10',
          },
        ],
      },
      {
        batch_number: 2,
        questions: [
          {
            question_text: 'What resources do you have?',
            question_type: 'text',
            answer: 'A gym membership',
          },
        ],
      },
    ];

    const mockProfile = {
      current_state: 'Beginner runner with gym access',
      desired_state: 'Complete a full marathon',
      constraints: 'Limited to 10 hours per week',
      motivation: 'Health improvement',
      domain_context: 'Distance running and endurance training',
      narrative_summary:
        'You are a beginner runner looking to complete a marathon.',
    };

    it('should call AiService.generateJson with system and user prompts', async () => {
      mockAiService.generateJson.mockResolvedValue(mockProfile);

      await service.generateGoalProfile('Run a marathon', priorBatches, 'en');

      expect(mockAiService.generateJson).toHaveBeenCalledTimes(1);
      const [systemPrompt, userPrompt] =
        mockAiService.generateJson.mock.calls[0];
      expect(typeof systemPrompt).toBe('string');
      expect(typeof userPrompt).toBe('string');
    });

    it('should pass intake model and reasoning to AiService', async () => {
      mockAiService.generateJson.mockResolvedValue(mockProfile);

      await service.generateGoalProfile('Run a marathon', priorBatches, 'en');

      const [, , model, reasoning] = mockAiService.generateJson.mock.calls[0];
      expect(model).toBe(config.intake.model);
      expect(reasoning).toBe('high');
    });

    it('should include all 6 required profile sections in system prompt', async () => {
      mockAiService.generateJson.mockResolvedValue(mockProfile);

      await service.generateGoalProfile('Run a marathon', priorBatches, 'en');

      const systemPrompt = mockAiService.generateJson.mock.calls[0][0];
      expect(systemPrompt).toContain('current_state');
      expect(systemPrompt).toContain('desired_state');
      expect(systemPrompt).toContain('constraints');
      expect(systemPrompt).toContain('motivation');
      expect(systemPrompt).toContain('domain_context');
      expect(systemPrompt).toContain('narrative_summary');
    });

    it('should mention goal_specific_insights in system prompt', async () => {
      mockAiService.generateJson.mockResolvedValue(mockProfile);

      await service.generateGoalProfile('Run a marathon', priorBatches, 'en');

      const systemPrompt = mockAiService.generateJson.mock.calls[0][0];
      expect(systemPrompt).toContain('goal_specific_insights');
    });

    it('should include goal description and all prior Q&A in user prompt', async () => {
      mockAiService.generateJson.mockResolvedValue(mockProfile);

      await service.generateGoalProfile('Run a marathon', priorBatches, 'en');

      const userPrompt = mockAiService.generateJson.mock.calls[0][1];
      expect(userPrompt).toContain('Run a marathon');
      expect(userPrompt).toContain('What motivated you?');
      expect(userPrompt).toContain('To get healthy');
      expect(userPrompt).toContain('What resources do you have?');
      expect(userPrompt).toContain('A gym membership');
      expect(userPrompt).toContain('Batch 1');
      expect(userPrompt).toContain('Batch 2');
    });

    it('should include timeline context when prior batches have a date question', async () => {
      jest.useFakeTimers({ now: new Date('2026-02-20T00:00:00Z') });
      mockAiService.generateJson.mockResolvedValue(mockProfile);

      const batchesWithDate = [
        {
          batch_number: 1,
          questions: [
            {
              question_text: 'What motivated you?',
              question_type: 'text',
              answer: 'To get healthy',
            },
            {
              question_text: 'When do you want to achieve this goal by?',
              question_type: 'text',
              answer: '2026-08-15',
              config: { format: 'date' },
            },
          ],
        },
      ];

      await service.generateGoalProfile(
        'Run a marathon',
        batchesWithDate,
        'en',
      );

      const userPrompt = mockAiService.generateJson.mock.calls[0][1];
      expect(userPrompt).toContain("Today's date: 2026-02-20");
      expect(userPrompt).toContain('Target deadline: 2026-08-15');
      expect(userPrompt).toContain('Time remaining:');

      jest.useRealTimers();
    });

    it('should not include timeline context when no date question in prior batches', async () => {
      mockAiService.generateJson.mockResolvedValue(mockProfile);

      await service.generateGoalProfile('Run a marathon', priorBatches, 'en');

      const userPrompt = mockAiService.generateJson.mock.calls[0][1];
      expect(userPrompt).not.toContain('<timeline>');
      expect(userPrompt).not.toContain("Today's date");
    });

    it('should propagate AiService errors (does not catch them)', async () => {
      mockAiService.generateJson.mockRejectedValue(
        new Error('AI service unavailable'),
      );

      await expect(
        service.generateGoalProfile('Run a marathon', priorBatches, 'en'),
      ).rejects.toThrow('AI service unavailable');
    });
  });

  describe('generateNextBatch', () => {
    const mockGeneratedBatch = {
      questions: [
        {
          question_text: 'What resources do you have?',
          question_type: 'text',
          config: null,
          order_in_batch: 1,
        },
        {
          question_text: 'How motivated are you?',
          question_type: 'scale',
          config: { min: 1, max: 10, min_label: 'Low', max_label: 'High' },
          order_in_batch: 2,
        },
        {
          question_text: 'What is your biggest obstacle?',
          question_type: 'single_choice',
          config: { options: ['Time', 'Money', 'Knowledge'] },
          order_in_batch: 3,
        },
      ],
      is_complete: false,
    };

    const priorBatches = [
      {
        batch_number: 1,
        questions: [
          {
            question_text: 'What motivated you?',
            question_type: 'text',
            answer: 'To get healthy',
          },
          {
            question_text: 'Hours per week?',
            question_type: 'scale',
            answer: '10',
          },
        ],
      },
    ];

    it('should call AiService.generateJson with system and user prompts', async () => {
      mockAiService.generateJson.mockResolvedValue(mockGeneratedBatch);

      await service.generateNextBatch({
        goalDescription: 'Run a marathon',
        priorBatches,
        batchNumber: 2,
        language: 'en',
      });

      expect(mockAiService.generateJson).toHaveBeenCalledTimes(1);
      const [systemPrompt, userPrompt] =
        mockAiService.generateJson.mock.calls[0];
      expect(typeof systemPrompt).toBe('string');
      expect(typeof userPrompt).toBe('string');
    });

    it('should pass intake model to AiService', async () => {
      mockAiService.generateJson.mockResolvedValue(mockGeneratedBatch);

      await service.generateNextBatch({
        goalDescription: 'Run a marathon',
        priorBatches,
        batchNumber: 2,
        language: 'en',
      });

      const [, , model] = mockAiService.generateJson.mock.calls[0];
      expect(model).toBe(config.intake.model);
    });

    it('should include goal description in user prompt', async () => {
      mockAiService.generateJson.mockResolvedValue(mockGeneratedBatch);

      await service.generateNextBatch({
        goalDescription: 'Run a marathon',
        priorBatches,
        batchNumber: 2,
        language: 'en',
      });

      const userPrompt = mockAiService.generateJson.mock.calls[0][1];
      expect(userPrompt).toContain('Run a marathon');
    });

    it('should include prior Q&A context in user prompt', async () => {
      mockAiService.generateJson.mockResolvedValue(mockGeneratedBatch);

      await service.generateNextBatch({
        goalDescription: 'Run a marathon',
        priorBatches,
        batchNumber: 2,
        language: 'en',
      });

      const userPrompt = mockAiService.generateJson.mock.calls[0][1];
      expect(userPrompt).toContain('What motivated you?');
      expect(userPrompt).toContain('To get healthy');
      expect(userPrompt).toContain('Batch 1');
    });

    it('should include batch number and remaining budget in user prompt', async () => {
      mockAiService.generateJson.mockResolvedValue(mockGeneratedBatch);

      await service.generateNextBatch({
        goalDescription: 'Run a marathon',
        priorBatches,
        batchNumber: 2,
        language: 'en',
      });

      const userPrompt = mockAiService.generateJson.mock.calls[0][1];
      expect(userPrompt).toContain('batch 2');
      const remainingBudget = config.intake.maxBatches - 2 + 1;
      expect(userPrompt).toContain(`${remainingBudget} batches remaining`);
    });

    it('should return is_complete: true when batchNumber >= maxBatches', async () => {
      const result = await service.generateNextBatch({
        goalDescription: 'Run a marathon',
        priorBatches,
        batchNumber: config.intake.maxBatches,
        language: 'en',
      });

      expect(result).toEqual({ questions: [], is_complete: true });
      expect(mockAiService.generateJson).not.toHaveBeenCalled();
    });

    it('should include pacing info for batch number in system prompt', async () => {
      mockAiService.generateJson.mockResolvedValue(mockGeneratedBatch);

      await service.generateNextBatch({
        goalDescription: 'Run a marathon',
        priorBatches,
        batchNumber: 3,
        language: 'en',
      });

      const systemPrompt = mockAiService.generateJson.mock.calls[0][0];
      expect(systemPrompt).toContain('batch="3"');
    });

    it('should include answer-threading strategy in system prompt', async () => {
      mockAiService.generateJson.mockResolvedValue(mockGeneratedBatch);

      await service.generateNextBatch({
        goalDescription: 'Run a marathon',
        priorBatches,
        batchNumber: 2,
        language: 'en',
      });

      const systemPrompt = mockAiService.generateJson.mock.calls[0][0];
      expect(systemPrompt).toContain('ANSWER-THREADING');
      expect(systemPrompt).toContain('ENERGY SIGNALS');
      expect(systemPrompt).toContain('RESISTANCE SIGNALS');
      expect(systemPrompt).toContain('CONTRADICTION SIGNALS');
    });

    it('should include reflection batch instruction in system prompt', async () => {
      mockAiService.generateJson.mockResolvedValue(mockGeneratedBatch);

      await service.generateNextBatch({
        goalDescription: 'Run a marathon',
        priorBatches,
        batchNumber: 2,
        language: 'en',
      });

      const systemPrompt = mockAiService.generateJson.mock.calls[0][0];
      expect(systemPrompt).toContain('reflection');
      expect(systemPrompt).toContain('What am I missing');
    });

    it('should annotate long text answers in user prompt', async () => {
      mockAiService.generateJson.mockResolvedValue(mockGeneratedBatch);

      const batchesWithLongAnswer = [
        {
          batch_number: 1,
          questions: [
            {
              question_text: 'What motivated you?',
              question_type: 'text',
              answer: 'A'.repeat(201),
            },
          ],
        },
      ];

      await service.generateNextBatch({
        goalDescription: 'Run a marathon',
        priorBatches: batchesWithLongAnswer,
        batchNumber: 2,
        language: 'en',
      });

      const userPrompt = mockAiService.generateJson.mock.calls[0][1];
      expect(userPrompt).toContain('[LONG ANSWER - high engagement signal]');
    });

    it('should annotate short text answers in user prompt', async () => {
      mockAiService.generateJson.mockResolvedValue(mockGeneratedBatch);

      const batchesWithShortAnswer = [
        {
          batch_number: 1,
          questions: [
            {
              question_text: 'What motivated you?',
              question_type: 'text',
              answer: 'Health',
            },
          ],
        },
      ];

      await service.generateNextBatch({
        goalDescription: 'Run a marathon',
        priorBatches: batchesWithShortAnswer,
        batchNumber: 2,
        language: 'en',
      });

      const userPrompt = mockAiService.generateJson.mock.calls[0][1];
      expect(userPrompt).toContain(
        '[SHORT ANSWER - possible avoidance signal]',
      );
    });

    it('should not annotate choice/scale answers regardless of length', async () => {
      mockAiService.generateJson.mockResolvedValue(mockGeneratedBatch);

      const batchesWithChoiceAnswer = [
        {
          batch_number: 1,
          questions: [
            {
              question_text: 'Hours per week?',
              question_type: 'scale',
              answer: '5',
            },
            {
              question_text: 'Attempted before?',
              question_type: 'single_choice',
              answer: 'No',
            },
          ],
        },
      ];

      await service.generateNextBatch({
        goalDescription: 'Run a marathon',
        priorBatches: batchesWithChoiceAnswer,
        batchNumber: 2,
        language: 'en',
      });

      const userPrompt = mockAiService.generateJson.mock.calls[0][1];
      expect(userPrompt).not.toContain('[LONG ANSWER');
      expect(userPrompt).not.toContain('[SHORT ANSWER');
    });

    it('should include thread-focused analysis instruction in user prompt', async () => {
      mockAiService.generateJson.mockResolvedValue(mockGeneratedBatch);

      await service.generateNextBatch({
        goalDescription: 'Run a marathon',
        priorBatches,
        batchNumber: 2,
        language: 'en',
      });

      const userPrompt = mockAiService.generateJson.mock.calls[0][1];
      expect(userPrompt).toContain('answers with the most EMOTIONAL energy');
      expect(userPrompt).toContain('vague or avoidant');
      expect(userPrompt).toContain('contradictions between answers');
    });

    it('should propagate AiService errors (does not catch them)', async () => {
      mockAiService.generateJson.mockRejectedValue(
        new Error('AI service unavailable'),
      );

      await expect(
        service.generateNextBatch({
          goalDescription: 'Run a marathon',
          priorBatches,
          batchNumber: 2,
          language: 'en',
        }),
      ).rejects.toThrow('AI service unavailable');
    });

    describe('timeline context injection', () => {
      const priorBatchesWithDate = [
        {
          batch_number: 1,
          questions: [
            {
              question_text: 'What motivated you?',
              question_type: 'text',
              answer: 'To get healthy',
            },
            {
              question_text: 'When do you want to achieve this goal by?',
              question_type: 'text',
              answer: '2026-08-15',
              config: { format: 'date' },
            },
          ],
        },
      ];

      beforeEach(() => {
        jest.useFakeTimers({ now: new Date('2026-02-20T00:00:00Z') });
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should inject timeline context when prior batches have a date question', async () => {
        mockAiService.generateJson.mockResolvedValue(mockGeneratedBatch);

        await service.generateNextBatch({
          goalDescription: 'Run a marathon',
          priorBatches: priorBatchesWithDate,
          batchNumber: 2,
          language: 'en',
        });

        const userPrompt = mockAiService.generateJson.mock.calls[0][1];
        expect(userPrompt).toContain("Today's date: 2026-02-20");
        expect(userPrompt).toContain('Target deadline: 2026-08-15');
        expect(userPrompt).toContain('Time remaining:');
      });

      it('should show approximate months when >= 30 days', async () => {
        mockAiService.generateJson.mockResolvedValue(mockGeneratedBatch);

        await service.generateNextBatch({
          goalDescription: 'Run a marathon',
          priorBatches: priorBatchesWithDate,
          batchNumber: 2,
          language: 'en',
        });

        const userPrompt = mockAiService.generateJson.mock.calls[0][1];
        // 2026-02-20 to 2026-08-15 = 176 days = ~6 months
        expect(userPrompt).toContain('~6 months (176 days)');
      });

      it('should show only days when < 30 days remaining', async () => {
        mockAiService.generateJson.mockResolvedValue(mockGeneratedBatch);

        const batchesShortDuration = [
          {
            batch_number: 1,
            questions: [
              {
                question_text: 'When do you want to achieve this goal by?',
                question_type: 'text',
                answer: '2026-03-07',
                config: { format: 'date' },
              },
            ],
          },
        ];

        await service.generateNextBatch({
          goalDescription: 'Run a marathon',
          priorBatches: batchesShortDuration,
          batchNumber: 2,
          language: 'en',
        });

        const userPrompt = mockAiService.generateJson.mock.calls[0][1];
        expect(userPrompt).toContain('Time remaining: 15 days');
        expect(userPrompt).not.toContain('months');
      });

      it('should show overdue when date is in the past', async () => {
        mockAiService.generateJson.mockResolvedValue(mockGeneratedBatch);

        const batchesPastDate = [
          {
            batch_number: 1,
            questions: [
              {
                question_text: 'When do you want to achieve this goal by?',
                question_type: 'text',
                answer: '2026-02-10',
                config: { format: 'date' },
              },
            ],
          },
        ];

        await service.generateNextBatch({
          goalDescription: 'Run a marathon',
          priorBatches: batchesPastDate,
          batchNumber: 2,
          language: 'en',
        });

        const userPrompt = mockAiService.generateJson.mock.calls[0][1];
        expect(userPrompt).toContain('Overdue by 10 days');
      });

      it('should not inject timeline context when no date question in prior batches', async () => {
        mockAiService.generateJson.mockResolvedValue(mockGeneratedBatch);

        await service.generateNextBatch({
          goalDescription: 'Run a marathon',
          priorBatches,
          batchNumber: 2,
          language: 'en',
        });

        const userPrompt = mockAiService.generateJson.mock.calls[0][1];
        expect(userPrompt).not.toContain('<timeline>');
        expect(userPrompt).not.toContain("Today's date");
      });

      it('should show "Due today" when target date is today', async () => {
        mockAiService.generateJson.mockResolvedValue(mockGeneratedBatch);

        const batchesDueToday = [
          {
            batch_number: 1,
            questions: [
              {
                question_text: 'When do you want to achieve this goal by?',
                question_type: 'text',
                answer: '2026-02-20',
                config: { format: 'date' },
              },
            ],
          },
        ];

        await service.generateNextBatch({
          goalDescription: 'Run a marathon',
          priorBatches: batchesDueToday,
          batchNumber: 2,
          language: 'en',
        });

        const userPrompt = mockAiService.generateJson.mock.calls[0][1];
        expect(userPrompt).toContain('Time remaining: Due today');
      });

      it('should skip malformed date and produce no timeline context', async () => {
        mockAiService.generateJson.mockResolvedValue(mockGeneratedBatch);

        const batchesBadDate = [
          {
            batch_number: 1,
            questions: [
              {
                question_text: 'When do you want to achieve this goal by?',
                question_type: 'text',
                answer: 'garbage',
                config: { format: 'date' },
              },
            ],
          },
        ];

        await service.generateNextBatch({
          goalDescription: 'Run a marathon',
          priorBatches: batchesBadDate,
          batchNumber: 2,
          language: 'en',
        });

        const userPrompt = mockAiService.generateJson.mock.calls[0][1];
        expect(userPrompt).not.toContain('<timeline>');
      });
    });
  });

});
