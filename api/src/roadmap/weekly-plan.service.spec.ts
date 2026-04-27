import { NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { AiService } from "../ai/ai.service.js";
import { UserLanguageService } from "../common/user-language.service.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import { UsageService } from "../usage/usage.service.js";
import { RoadmapContextService } from "./roadmap-context.service.js";
import { RoadmapDataService } from "./roadmap-data.service.js";
import { RoadmapGenerationService } from "./roadmap-generation.service.js";
import { WeeklyPlanService } from "./weekly-plan.service.js";

describe("WeeklyPlanService", () => {
  let service: WeeklyPlanService;
  let mockStorage: {
    getCurrentWeeklyPlan: jest.Mock;
    loadRoadmapAndMilestone: jest.Mock;
    [key: string]: jest.Mock;
  };

  const goalId = "goal-uuid";
  const userId = "user-uuid";

  beforeEach(async () => {
    mockStorage = {
      getCurrentWeeklyPlan: jest.fn(),
      loadRoadmapAndMilestone: jest.fn(),
      storeWeeklyPlan: jest.fn(),
      emitPlanGenerated: jest.fn(),
      getCurrentWeekStart: jest.fn().mockReturnValue("2026-02-24"),
      autoCompleteExpiredPlans: jest.fn(),
      getLastCompletedPlanWithoutSummary: jest.fn().mockResolvedValue(null),
      calculateWeekNumber: jest.fn().mockResolvedValue(1),
      warnFallbackFailed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeeklyPlanService,
        {
          provide: RoadmapContextService,
          useValue: { assembleContext: jest.fn() },
        },
        {
          provide: RoadmapGenerationService,
          useValue: { generateWeeklyPlan: jest.fn() },
        },
        {
          provide: AiService,
          useValue: { generateJson: jest.fn() },
        },
        { provide: RoadmapDataService, useValue: mockStorage },
        {
          provide: UserLanguageService,
          useValue: { getLanguage: jest.fn().mockResolvedValue("en") },
        },
        {
          provide: UsageService,
          useValue: {
            reserveGeneration: jest.fn().mockResolvedValue({
              granted: true,
              used: 1,
              limit: 20,
              is_pro: false,
            }),
          },
        },
        {
          provide: SupabaseService,
          useValue: { getAdminClient: jest.fn() },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<WeeklyPlanService>(WeeklyPlanService);
  });

  describe("getCurrentWeeklyPlan", () => {
    it("should return active weekly plan", async () => {
      const mockPlan = {
        id: "plan-uuid",
        status: "active",
      };
      mockStorage.getCurrentWeeklyPlan.mockResolvedValue(mockPlan);

      const result = await service.getCurrentWeeklyPlan(goalId, userId);
      expect(result).toEqual(mockPlan);
    });

    it("should return null when no active plan found", async () => {
      mockStorage.getCurrentWeeklyPlan.mockResolvedValue(null);

      const result = await service.getCurrentWeeklyPlan(goalId, userId);
      expect(result).toBeNull();
    });
  });

  describe("getActiveRoadmapAndMilestone", () => {
    it("should throw NotFoundException when no roadmap found", async () => {
      mockStorage.loadRoadmapAndMilestone.mockRejectedValue(
        new NotFoundException("No roadmap found for this goal"),
      );

      await expect(
        service.getActiveRoadmapAndMilestone(goalId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
