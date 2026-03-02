/* eslint-disable max-lines-per-function */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { IntakeController } from './intake.controller.js';
import { IntakeBatchService } from './intake-batch.service.js';
import { IntakeProfileService } from './intake-profile.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';

describe('IntakeController', () => {
  let controller: IntakeController;
  let batchService: {
    getNextBatch: jest.Mock;
    submitBatch: jest.Mock;
  };
  let profileService: {
    retryProfile: jest.Mock;
  };

  beforeEach(async () => {
    batchService = {
      getNextBatch: jest.fn(),
      submitBatch: jest.fn(),
    };
    profileService = {
      retryProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntakeController],
      providers: [
        { provide: IntakeBatchService, useValue: batchService },
        { provide: IntakeProfileService, useValue: profileService },
        { provide: SupabaseService, useValue: {} },
      ],
    }).compile();

    controller = module.get<IntakeController>(IntakeController);
  });

  describe('GET next-batch', () => {
    it('should call batchService.getNextBatch with userId and goalId', async () => {
      const userId = 'user-123';
      const goalId = 'goal-456';
      const expectedResult = {
        batch_id: 'batch-789',
        batch_number: 1,
        is_complete: false,
        questions: [],
      };

      batchService.getNextBatch.mockResolvedValue(expectedResult);

      const result = await controller.getNextBatch(userId, goalId);

      expect(batchService.getNextBatch).toHaveBeenCalledWith(userId, goalId);
      expect(result).toEqual(expectedResult);
    });

    it('should return service result directly', async () => {
      const serviceResult = {
        batch_id: 'batch-abc',
        batch_number: 1,
        is_complete: false,
        questions: [
          {
            id: 'q-1',
            question_text: 'Test question',
            question_type: 'text',
            config: null,
            order_in_batch: 1,
          },
        ],
      };

      batchService.getNextBatch.mockResolvedValue(serviceResult);

      const result = await controller.getNextBatch('user-1', 'goal-1');

      expect(result).toBe(serviceResult);
    });
  });

  describe('POST submit-batch', () => {
    it('should call batchService.submitBatch with userId, goalId, and answers', async () => {
      const userId = 'user-123';
      const goalId = 'goal-456';
      const answers = [{ question_id: 'q-1', answer_text: 'My answer' }];
      const expectedResult = {
        submitted_batch: { batch_id: 'batch-789', batch_number: 1 },
        message: 'Answers submitted successfully',
      };

      batchService.submitBatch.mockResolvedValue(expectedResult);

      const result = await controller.submitBatch(userId, goalId, { answers });

      expect(batchService.submitBatch).toHaveBeenCalledWith(userId, goalId, answers);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('POST retry-profile', () => {
    it('should call profileService.retryProfile with userId and goalId', async () => {
      const userId = 'user-123';
      const goalId = 'goal-456';
      const expectedResult = {
        profile_id: 'profile-id-1',
        goal_status: 'intake_completed',
      };

      profileService.retryProfile.mockResolvedValue(expectedResult);

      const result = await controller.retryProfile(userId, goalId);

      expect(profileService.retryProfile).toHaveBeenCalledWith(userId, goalId);
      expect(result).toEqual(expectedResult);
    });

    it('should return the service result directly', async () => {
      const serviceResult = {
        profile_id: null,
        goal_status: 'profile_generation_failed',
      };

      profileService.retryProfile.mockResolvedValue(serviceResult);

      const result = await controller.retryProfile('user-1', 'goal-1');

      expect(result).toBe(serviceResult);
    });
  });
});
