import { ConflictException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { SupabaseService } from "../supabase/supabase.service.js";
import { DebriefService } from "./debrief.service.js";

describe("DebriefService", () => {
  let service: DebriefService;
  let mockSupabaseService: { getAdminClient: jest.Mock };
  let mockEventEmitter: { emit: jest.Mock };

  const userId = "user-uuid";
  const goalId = "goal-uuid";

  beforeEach(async () => {
    mockSupabaseService = { getAdminClient: jest.fn() };
    mockEventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DebriefService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<DebriefService>(DebriefService);
  });

  describe("submitDebrief", () => {
    const dto = { note: "Good day", task_ratings: [] };

    it("should submit debrief and emit event", async () => {
      const mockDebrief = {
        id: "debrief-uuid",
        goal_id: goalId,
        user_id: userId,
        note: "Good day",
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
                    is: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({
                        data: { id: goalId },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (fromCallIndex === 2) {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      limit: jest
                        .fn()
                        .mockResolvedValue({ data: [], error: null }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (fromCallIndex === 3) {
            return {
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest
                    .fn()
                    .mockResolvedValue({ data: mockDebrief, error: null }),
                }),
              }),
            };
          }
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }),
      });

      const result = await service.submitDebrief(goalId, userId, dto);
      expect(result).toEqual(mockDebrief);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "debrief.submitted",
        expect.any(Object),
      );
    });

    it("should throw ConflictException on duplicate debrief", async () => {
      let fromCallIndex = 0;
      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn().mockImplementation(() => {
          fromCallIndex++;
          if (fromCallIndex === 1) {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    is: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({
                        data: { id: goalId },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({
                      data: [{ id: "existing-debrief" }],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }),
      });

      await expect(service.submitDebrief(goalId, userId, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
