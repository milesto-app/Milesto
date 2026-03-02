import { BadRequestException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { IntakeBatchService } from './intake-batch.service.js';
import type { GoalService } from '../goal/goal.service.js';
import type { IntakeStoreService } from './intake-store.service.js';
import type { IntakeGenerationService } from './intake-generation.service.js';
import type { IntakeContextService } from './intake-context.service.js';
import type { IntakeFallbackService } from './intake-fallback.service.js';
import type { UserLanguageService } from '../common/user-language.service.js';
import type { IntakeTargetDateService } from './intake-target-date.service.js';

describe('IntakeBatchService', () => {
  let service: IntakeBatchService;
  let goalService: { findOne: jest.Mock };
  let storeService: {
    queryLatestBatch: jest.Mock;
    queryUnansweredBatch: jest.Mock;
    loadBatchQuestions: jest.Mock;
    reServeBatch: jest.Mock;
    persistAnswers: jest.Mock;
    storeGeneratedBatch: jest.Mock;
  };
  let generationService: { generateBatch: jest.Mock };
  let contextService: { loadPriorBatchContext: jest.Mock };
  let fallbackService: { serveFirstBatch: jest.Mock; serveFallback: jest.Mock };
  let eventEmitter: { emit: jest.Mock };
  let languageService: { getLanguage: jest.Mock };
  let targetDateService: { tryExtractTargetDate: jest.Mock };

  const userId = 'user-123';
  const goalId = 'goal-456';

  const mockGoal = (
    status = 'intake_in_progress',
  ): { id: string; status: string; description: string } => ({
    id: goalId,
    status,
    description: 'Complete a full marathon',
  });

  beforeEach(() => {
    goalService = { findOne: jest.fn() };
    storeService = {
      queryLatestBatch: jest.fn(),
      queryUnansweredBatch: jest.fn(),
      loadBatchQuestions: jest.fn(),
      reServeBatch: jest.fn(),
      persistAnswers: jest.fn(),
      storeGeneratedBatch: jest.fn(),
    };
    generationService = { generateBatch: jest.fn() };
    contextService = { loadPriorBatchContext: jest.fn() };
    fallbackService = { serveFirstBatch: jest.fn(), serveFallback: jest.fn() };
    eventEmitter = { emit: jest.fn() };
    languageService = { getLanguage: jest.fn().mockResolvedValue('en') };
    targetDateService = { tryExtractTargetDate: jest.fn().mockResolvedValue(undefined) };

    service = new IntakeBatchService(
      goalService as unknown as GoalService,
      storeService as unknown as IntakeStoreService,
      eventEmitter as unknown as EventEmitter2,
    );

    // Property injection
    Object.assign(service, {
      generationService: generationService as unknown as IntakeGenerationService,
      contextService: contextService as unknown as IntakeContextService,
      fallbackService: fallbackService as unknown as IntakeFallbackService,
      languageService: languageService as unknown as UserLanguageService,
      targetDateService: targetDateService as unknown as IntakeTargetDateService,
    });
  });

  describe('getNextBatch', () => {
    it('should throw when goal is not in intake_in_progress status', async () => {
      goalService.findOne.mockResolvedValue(mockGoal('active'));

      await expect(service.getNextBatch(userId, goalId)).rejects.toThrow(BadRequestException);
    });

    it('should serve first batch when no batches exist', async () => {
      goalService.findOne.mockResolvedValue(mockGoal());
      storeService.queryLatestBatch.mockResolvedValue(null);
      const batch = { batch_id: 'b-1', batch_number: 1, is_complete: false, questions: [] };
      fallbackService.serveFirstBatch.mockResolvedValue(batch);

      const result = await service.getNextBatch(userId, goalId);

      expect(fallbackService.serveFirstBatch).toHaveBeenCalledWith(goalId, 'en');
      expect(result).toEqual(batch);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'batch.served',
        expect.objectContaining({ goal_id: goalId }),
      );
    });

    it('should re-serve unanswered batch', async () => {
      goalService.findOne.mockResolvedValue(mockGoal());
      storeService.queryLatestBatch.mockResolvedValue({
        id: 'b-1',
        batch_number: 1,
        is_answered: false,
      });
      const served = { batch_id: 'b-1', batch_number: 1, is_complete: false, questions: [] };
      storeService.reServeBatch.mockResolvedValue(served);

      const result = await service.getNextBatch(userId, goalId);

      expect(storeService.reServeBatch).toHaveBeenCalled();
      expect(result).toEqual(served);
    });

    it('should generate next batch when latest is answered', async () => {
      goalService.findOne.mockResolvedValue(mockGoal());
      storeService.queryLatestBatch.mockResolvedValue({
        id: 'b-1',
        batch_number: 1,
        is_answered: true,
      });
      contextService.loadPriorBatchContext.mockResolvedValue([]);
      const questions = [
        { question_text: 'Q?', question_type: 'text', config: null, order_in_batch: 1 },
      ];
      generationService.generateBatch.mockResolvedValue({ kind: 'questions', questions });
      storeService.storeGeneratedBatch.mockResolvedValue({
        batch_id: 'b-2',
        batch_number: 2,
        is_complete: false,
        questions,
      });

      const result = await service.getNextBatch(userId, goalId);

      expect(generationService.generateBatch).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ batch_id: 'b-2' }));
    });

    it('should serve fallback when generation fails', async () => {
      goalService.findOne.mockResolvedValue(mockGoal());
      storeService.queryLatestBatch.mockResolvedValue({
        id: 'b-1',
        batch_number: 1,
        is_answered: true,
      });
      contextService.loadPriorBatchContext.mockResolvedValue([]);
      generationService.generateBatch.mockRejectedValue(new Error('AI failed'));
      const fallback = { batch_id: 'fb-1', batch_number: 2, is_complete: false, questions: [] };
      fallbackService.serveFallback.mockResolvedValue(fallback);

      const result = await service.getNextBatch(userId, goalId);

      expect(fallbackService.serveFallback).toHaveBeenCalled();
      expect(result).toEqual(fallback);
    });
  });

  describe('submitBatch', () => {
    it('should throw when goal is not in intake_in_progress status', async () => {
      goalService.findOne.mockResolvedValue(mockGoal('active'));

      await expect(service.submitBatch(userId, goalId, [])).rejects.toThrow(BadRequestException);
    });

    it('should persist answers and emit batch.answered event', async () => {
      goalService.findOne.mockResolvedValue(mockGoal());
      storeService.queryUnansweredBatch.mockResolvedValue({ id: 'b-1', batch_number: 1 });
      storeService.loadBatchQuestions.mockResolvedValue([
        { id: 'q-1', question_type: 'text', config: null },
      ]);
      storeService.persistAnswers.mockResolvedValue(undefined);

      // Mock generation for next batch
      contextService.loadPriorBatchContext.mockResolvedValue([]);
      generationService.generateBatch.mockResolvedValue({
        kind: 'complete',
        profileResult: { profile_id: 'p-1', profile_status: 'intake_completed' },
      });

      const answers = [{ question_id: 'q-1', answer_text: 'My answer' }];
      await service.submitBatch(userId, goalId, answers);

      expect(storeService.persistAnswers).toHaveBeenCalledWith(answers, 'b-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'batch.answered',
        expect.objectContaining({ batch_id: 'b-1' }),
      );
    });
  });
});
