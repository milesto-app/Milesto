import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { IntakeQualityService } from './intake-quality.service.js';
import { AiService } from '../ai/ai.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import {
  mockGoalChain,
  mockPriorChain,
  mockQuestionsChain,
  mockUpdateChain,
} from './test-helpers/supabase-mock.js';

const VALID_BATCH = [
  {
    question_text: 'What is your main challenge?',
    question_type: 'text',
    config: null,
    order_in_batch: 1,
  },
  {
    question_text: 'How confident are you?',
    question_type: 'scale',
    config: { min: 1, max: 10, min_label: 'Low', max_label: 'High' },
    order_in_batch: 2,
  },
  {
    question_text: 'What is your preferred approach?',
    question_type: 'single_choice',
    config: { options: ['Structured', 'Flexible', 'Mixed'] },
    order_in_batch: 3,
  },
];
const PAYLOAD = {
  goal_id: 'goal-123',
  batch_id: 'batch-456',
  batch_number: 2,
  user_id: 'user-789',
};
const QUESTIONS = [
  { question_text: 'What is your goal?', question_type: 'text' },
  { question_text: 'How motivated are you?', question_type: 'scale' },
  { question_text: 'What approach?', question_type: 'single_choice' },
];
const GOAL = { description: 'Run a marathon' };
const PRIOR = [{ question_text: 'Previous question?', batch_number: 1 }];
const SCORES = {
  relevance: 0.8,
  depth_progression: 0.7,
  dimension_coverage: 0.9,
  redundancy_avoidance: 0.85,
};

// eslint-disable-next-line max-lines-per-function
describe('IntakeQualityService', () => {
  let service: IntakeQualityService;
  let mockAi: { generateJSON: jest.Mock };
  let mockSb: { from: jest.Mock };

  beforeEach(async () => {
    mockAi = { generateJSON: jest.fn() };
    mockSb = { from: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntakeQualityService,
        { provide: AiService, useValue: mockAi },
        { provide: SupabaseService, useValue: { getAdminClient: () => mockSb } },
      ],
    }).compile();
    service = module.get<IntakeQualityService>(IntakeQualityService);
  });

  describe('validateBatch', () => {
    it('should return valid for a fully valid batch', () => {
      expect(service.validateBatch(VALID_BATCH).valid).toBe(true);
    });
    it('should return structural layer on structural failure', () => {
      expect(service.validateBatch(VALID_BATCH.slice(0, 1)).layer).toBe('structural');
    });
    it('should return semantic layer when structural passes but semantic fails', () => {
      const batch = [
        { ...VALID_BATCH[0], question_text: 'No question mark' },
        VALID_BATCH[1],
        VALID_BATCH[2],
      ];
      expect(service.validateBatch(batch).layer).toBe('semantic');
    });
  });

  // eslint-disable-next-line max-lines-per-function
  describe('handleBatchServed', () => {
    function setupAllMocks(scores = SCORES): { updateChain: Record<string, jest.Mock> } {
      const updateChain = mockUpdateChain();
      mockSb.from
        .mockReturnValueOnce(mockQuestionsChain(QUESTIONS))
        .mockReturnValueOnce(mockGoalChain(GOAL))
        .mockReturnValueOnce(mockPriorChain(PRIOR))
        .mockReturnValueOnce(updateChain);
      mockAi.generateJSON.mockResolvedValue(scores);
      return { updateChain };
    }

    it('should load questions, goal, and prior from Supabase', async () => {
      setupAllMocks();
      await service.handleBatchServed(PAYLOAD);
      expect(mockSb.from).toHaveBeenCalledWith('intake_questions');
      expect(mockSb.from).toHaveBeenCalledWith('goals');
    });

    it('should store composite score', async () => {
      const { updateChain } = setupAllMocks();
      await service.handleBatchServed(PAYLOAD);
      expect(updateChain.update).toHaveBeenCalledWith({
        quality_score: expect.any(Number) as number,
      });
    });

    it('should log warning when composite < 0.5', async () => {
      setupAllMocks({
        relevance: 0.3,
        depth_progression: 0.2,
        dimension_coverage: 0.1,
        redundancy_avoidance: 0.4,
      });
      const spy = jest.spyOn(service['logger'], 'warn');
      await service.handleBatchServed(PAYLOAD);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Low quality score'));
    });

    it('should log info when composite >= 0.5', async () => {
      setupAllMocks();
      const spy = jest.spyOn(service['logger'], 'log');
      await service.handleBatchServed(PAYLOAD);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Quality score for batch'));
    });

    it('should handle question loading failure', async () => {
      mockSb.from.mockReturnValueOnce(mockQuestionsChain(null, { message: 'DB failed' }));
      const spy = jest.spyOn(service['logger'], 'error');
      await expect(service.handleBatchServed(PAYLOAD)).resolves.toBeUndefined();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Failed to load questions'));
    });

    it('should handle goal loading failure', async () => {
      mockSb.from
        .mockReturnValueOnce(mockQuestionsChain(QUESTIONS))
        .mockReturnValueOnce(mockGoalChain(null, { message: 'Not found' }));
      const spy = jest.spyOn(service['logger'], 'error');
      await expect(service.handleBatchServed(PAYLOAD)).resolves.toBeUndefined();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Failed to load goal'));
    });

    it('should handle AI scoring failure', async () => {
      mockSb.from
        .mockReturnValueOnce(mockQuestionsChain(QUESTIONS))
        .mockReturnValueOnce(mockGoalChain(GOAL))
        .mockReturnValueOnce(mockPriorChain(PRIOR));
      mockAi.generateJSON.mockRejectedValue(new Error('LLM timeout'));
      const spy = jest.spyOn(service['logger'], 'error');
      await expect(service.handleBatchServed(PAYLOAD)).resolves.toBeUndefined();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Quality scoring failed'));
    });

    it('should handle score update failure', async () => {
      mockSb.from
        .mockReturnValueOnce(mockQuestionsChain(QUESTIONS))
        .mockReturnValueOnce(mockGoalChain(GOAL))
        .mockReturnValueOnce(mockPriorChain(PRIOR))
        .mockReturnValueOnce(mockUpdateChain({ message: 'fail' }));
      mockAi.generateJSON.mockResolvedValue(SCORES);
      const spy = jest.spyOn(service['logger'], 'error');
      await expect(service.handleBatchServed(PAYLOAD)).resolves.toBeUndefined();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Failed to store quality score'));
    });

    it('should handle empty prior questions (batch 1)', async () => {
      mockSb.from
        .mockReturnValueOnce(mockQuestionsChain(QUESTIONS))
        .mockReturnValueOnce(mockGoalChain(GOAL))
        .mockReturnValueOnce(mockPriorChain([]))
        .mockReturnValueOnce(mockUpdateChain());
      mockAi.generateJSON.mockResolvedValue(SCORES);
      await service.handleBatchServed({ ...PAYLOAD, batch_number: 1 });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const userPrompt = String(mockAi.generateJSON.mock.calls[0]?.[1]);
      expect(userPrompt).toContain('None (this is the first batch)');
    });
  });
});
