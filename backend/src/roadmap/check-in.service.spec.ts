import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { SupabaseService } from '../supabase/supabase.service.js';
import { CheckInService } from './check-in.service.js';

describe('CheckInService', () => {
  let service: CheckInService;
  let mockSupabaseService: { getAdminClient: jest.Mock };

  const userId = 'user-uuid';
  const goalId = 'goal-uuid';

  beforeEach(async () => {
    mockSupabaseService = { getAdminClient: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckInService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<CheckInService>(CheckInService);
  });

  describe('submitCheckIn', () => {
    const dto = { energy_level: 'good' as const, note: 'Feeling great' };

    it('should submit check-in and return stored record', async () => {
      const mockCheckIn = {
        id: 'checkin-uuid',
        goal_id: goalId,
        user_id: userId,
        date: '2026-02-22',
        energy_level: 'good',
        note: 'Feeling great',
        created_at: '2026-02-22T08:00:00.000Z',
      };

      let fromCallIndex = 0;
      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn().mockImplementation(() => {
          fromCallIndex++;
          if (fromCallIndex === 1) {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: { status: 'complete' },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest
                  .fn()
                  .mockResolvedValue({ data: mockCheckIn, error: null }),
              }),
            }),
          };
        }),
      });

      const result = await service.submitCheckIn(goalId, userId, dto);
      expect(result).toEqual(mockCheckIn);
    });

    it('should throw ConflictException on duplicate check-in', async () => {
      let fromCallIndex = 0;
      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn().mockImplementation(() => {
          fromCallIndex++;
          if (fromCallIndex === 1) {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: { status: 'complete' },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: '23505', message: 'duplicate key' },
                }),
              }),
            }),
          };
        }),
      });

      await expect(service.submitCheckIn(goalId, userId, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException when no roadmap exists', async () => {
      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          }),
        }),
      });

      await expect(service.submitCheckIn(goalId, userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when roadmap is not complete', async () => {
      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { status: 'generating' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      await expect(service.submitCheckIn(goalId, userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getCheckIn', () => {
    it('should return check-in for given date', async () => {
      const mockCheckIn = { id: 'checkin-uuid', energy_level: 'good' };
      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest
                    .fn()
                    .mockResolvedValue({ data: mockCheckIn, error: null }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getCheckIn(goalId, userId, '2026-02-22');
      expect(result).toEqual(mockCheckIn);
    });

    it('should return null when not found', async () => {
      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' },
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getCheckIn(goalId, userId, '2026-02-22');
      expect(result).toBeNull();
    });
  });
});
