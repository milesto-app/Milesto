import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CheckInController } from './check-in.controller.js';
import { CheckInService } from './check-in.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';

describe('CheckInController', () => {
  let controller: CheckInController;
  let mockCheckInService: {
    submitCheckIn: jest.Mock;
    getCheckInHistory: jest.Mock;
  };

  const userId = 'user-123';
  const goalId = 'goal-456';

  const mockCheckIn = {
    id: 'checkin-uuid',
    goal_id: goalId,
    user_id: userId,
    date: '2026-02-22',
    energy_level: 'good',
    note: 'Feeling great',
    created_at: '2026-02-22T08:00:00.000Z',
  };

  beforeEach(async () => {
    mockCheckInService = {
      submitCheckIn: jest.fn(),
      getCheckInHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckInController],
      providers: [
        { provide: CheckInService, useValue: mockCheckInService },
        { provide: SupabaseService, useValue: {} },
      ],
    }).compile();

    controller = module.get<CheckInController>(CheckInController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /checkin', () => {
    it('should delegate to service and return check-in', async () => {
      const dto = { energy_level: 'good' as const, note: 'Feeling great' };
      mockCheckInService.submitCheckIn.mockResolvedValue(mockCheckIn);

      const result = await controller.submitCheckIn(goalId, userId, dto);

      expect(mockCheckInService.submitCheckIn).toHaveBeenCalledWith(
        goalId,
        userId,
        dto,
      );
      expect(result).toEqual(mockCheckIn);
    });

    it('should pass goalId and userId correctly', async () => {
      const dto = { energy_level: 'high' as const };
      mockCheckInService.submitCheckIn.mockResolvedValue(mockCheckIn);

      await controller.submitCheckIn('other-goal', 'other-user', dto);

      expect(mockCheckInService.submitCheckIn).toHaveBeenCalledWith(
        'other-goal',
        'other-user',
        dto,
      );
    });
  });

  describe('GET /checkin', () => {
    it('should delegate to service and return history', async () => {
      const mockHistory = [mockCheckIn];
      mockCheckInService.getCheckInHistory.mockResolvedValue(mockHistory);

      const result = await controller.getCheckInHistory(goalId, userId);

      expect(mockCheckInService.getCheckInHistory).toHaveBeenCalledWith(
        goalId,
        userId,
      );
      expect(result).toEqual(mockHistory);
    });

    it('should pass goalId and userId correctly', async () => {
      mockCheckInService.getCheckInHistory.mockResolvedValue([]);

      await controller.getCheckInHistory('other-goal', 'other-user');

      expect(mockCheckInService.getCheckInHistory).toHaveBeenCalledWith(
        'other-goal',
        'other-user',
      );
    });
  });
});
