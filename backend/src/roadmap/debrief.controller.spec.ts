import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DebriefController } from './debrief.controller.js';
import { DebriefService } from './debrief.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';

describe('DebriefController', () => {
  let controller: DebriefController;
  let mockDebriefService: {
    submitDebrief: jest.Mock;
    getDebriefHistory: jest.Mock;
  };

  const userId = 'user-123';
  const goalId = 'goal-456';

  beforeEach(async () => {
    mockDebriefService = {
      submitDebrief: jest.fn(),
      getDebriefHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DebriefController],
      providers: [
        { provide: DebriefService, useValue: mockDebriefService },
        { provide: SupabaseService, useValue: {} },
      ],
    }).compile();

    controller = module.get<DebriefController>(DebriefController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /debrief', () => {
    const dto = { note: 'Today was productive' };
    const mockDebrief = {
      id: 'debrief-uuid',
      goal_id: goalId,
      user_id: userId,
      date: '2026-02-22',
      note: dto.note,
      task_ratings: [],
      created_at: '2026-02-22T20:00:00.000Z',
    };

    it('should delegate to checkInService.submitDebrief and return 201', async () => {
      mockDebriefService.submitDebrief.mockResolvedValue(mockDebrief);

      const result = await controller.submitDebrief(goalId, userId, dto);

      expect(mockDebriefService.submitDebrief).toHaveBeenCalledWith(goalId, userId, dto);
      expect(result).toEqual(mockDebrief);
    });
  });

  describe('GET /debrief', () => {
    const mockHistory = [
      {
        id: 'd-1',
        goal_id: goalId,
        user_id: userId,
        date: '2026-02-22',
        note: 'Good day',
        task_ratings: [],
        created_at: '2026-02-22T20:00:00.000Z',
      },
    ];

    it('should delegate to checkInService.getDebriefHistory and return 200', async () => {
      mockDebriefService.getDebriefHistory.mockResolvedValue(mockHistory);

      const result = await controller.getDebriefHistory(goalId, userId);

      expect(mockDebriefService.getDebriefHistory).toHaveBeenCalledWith(goalId, userId);
      expect(result).toEqual(mockHistory);
    });
  });
});
