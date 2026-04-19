import { NotFoundException } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { UserLanguageService } from "../common/user-language.service.js";
import { UsageService } from "../usage/usage.service.js";
import { ContextPipelineService } from "./context-pipeline.service.js";
import { GenerationService } from "./generation.service.js";
import { WeeklyPlanService } from "./weekly-plan.service.js";
import { WeeklyPlanDataService } from "./weekly-plan-data.service.js";
import { WeeklyPlanQueryService } from "./weekly-plan-query.service.js";
import { WeeklyPlanStorageService } from "./weekly-plan-storage.service.js";

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
      formatSummaryForEmbedding: jest.fn(),
      formatMonthlySummaryForEmbedding: jest.fn(),
      warnFallbackFailed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeeklyPlanService,
        {
          provide: ContextPipelineService,
          useValue: { assembleContext: jest.fn() },
        },
        {
          provide: GenerationService,
          useValue: { generateWeeklyPlan: jest.fn() },
        },
        {
          provide: WeeklyPlanDataService,
          useValue: {
            generateAndStoreSummary: jest.fn(),
            generateMonthlySummaryIfNeeded: jest.fn(),
          },
        },
        {
          provide: WeeklyPlanQueryService,
          useValue: { queryWeekData: jest.fn() },
        },
        { provide: WeeklyPlanStorageService, useValue: mockStorage },
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
