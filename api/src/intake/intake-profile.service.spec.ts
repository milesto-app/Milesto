import { BadRequestException } from "@nestjs/common";
import type { EventEmitter2 } from "@nestjs/event-emitter";

import type { AiService } from "../ai/ai.service.js";
import type { UserLanguageService } from "../common/user-language.service.js";
import type { GoalService } from "../goal/goal.service.js";
import type { SupabaseService } from "../supabase/supabase.service.js";
import type { UsageService } from "../usage/usage.service.js";
import type { IntakeDataService } from "./intake-data.service.js";
import { IntakeProfileService } from "./intake-profile.service.js";

describe("IntakeProfileService", () => {
  let service: IntakeProfileService;
  let supabaseService: { getAdminClient: jest.Mock };
  let goalService: { findOne: jest.Mock };
  let aiService: { generateJson: jest.Mock };
  let dataService: {
    loadPriorBatchContext: jest.Mock;
    markProfileFailure: jest.Mock;
    updateGoalStatus: jest.Mock;
  };
  let eventEmitter: { emit: jest.Mock };
  let mockSupabase: { from: jest.Mock };
  let languageService: { getLanguage: jest.Mock };

  const userId = "user-123";
  const goalId = "goal-456";

  const mockProfile = {
    current_state: "beginner",
    desired_state: "expert",
    constraints: "limited time",
    motivation: "career growth",
    domain_context: "software",
    narrative_summary: "A motivated beginner",
  };

  beforeEach(() => {
    mockSupabase = { from: jest.fn() };
    supabaseService = {
      getAdminClient: jest.fn().mockReturnValue(mockSupabase),
    };
    goalService = { findOne: jest.fn() };
    aiService = { generateJson: jest.fn() };
    dataService = {
      loadPriorBatchContext: jest.fn(),
      markProfileFailure: jest.fn().mockResolvedValue({
        profile_id: null,
        profile_status: "profile_generation_failed",
      }),
      updateGoalStatus: jest.fn().mockResolvedValue(undefined),
    };
    eventEmitter = { emit: jest.fn() };
    languageService = { getLanguage: jest.fn().mockResolvedValue("en") };

    service = new IntakeProfileService(
      supabaseService as unknown as SupabaseService,
      goalService as unknown as GoalService,
      eventEmitter as unknown as EventEmitter2,
    );

    Object.assign(service, {
      languageService: languageService as unknown as UserLanguageService,
      aiService: aiService as unknown as AiService,
      dataService: dataService as unknown as IntakeDataService,
      usageService: {
        reserveGeneration: jest.fn().mockResolvedValue({
          granted: true,
          used: 1,
          limit: 20,
          is_pro: false,
        }),
      } as unknown as UsageService,
    });
  });

  describe("retryProfile", () => {
    it("should throw when goal is not in failed status", async () => {
      goalService.findOne.mockResolvedValue({
        status: "active",
        description: "desc",
        profile_generation_attempts: 0,
      });

      await expect(service.retryProfile(userId, goalId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw when max retries exceeded", async () => {
      goalService.findOne.mockResolvedValue({
        status: "profile_generation_failed",
        description: "desc",
        profile_generation_attempts: 100,
      });

      await expect(service.retryProfile(userId, goalId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("generateAndStoreProfile", () => {
    it("should generate and store profile successfully", async () => {
      dataService.loadPriorBatchContext.mockResolvedValue([]);
      aiService.generateJson.mockResolvedValue(mockProfile);

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await service.generateAndStoreProfile({
        userId,
        goalId,
        goalDescription: "Run a marathon",
        language: "en",
      });

      expect(result.profile_id).toBe(goalId);
      expect(result.profile_status).toBe("intake_completed");
      expect(dataService.updateGoalStatus).toHaveBeenCalledWith(
        goalId,
        "profile_generating",
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "profile.generated",
        expect.objectContaining({ profile_id: goalId }),
      );
    });

    it("should return failure when AI call fails", async () => {
      dataService.loadPriorBatchContext.mockResolvedValue([]);
      aiService.generateJson.mockRejectedValue(new Error("AI error"));

      const result = await service.generateAndStoreProfile({
        userId,
        goalId,
        goalDescription: "Run a marathon",
        language: "en",
      });

      expect(result.profile_id).toBeNull();
      expect(result.profile_status).toBe("profile_generation_failed");
      expect(dataService.markProfileFailure).toHaveBeenCalledWith(goalId);
    });

    it("should retry validation and return failure on second validation failure", async () => {
      const invalidProfile = { ...mockProfile, narrative_summary: "" };
      dataService.loadPriorBatchContext.mockResolvedValue([]);
      aiService.generateJson
        .mockResolvedValueOnce(invalidProfile)
        .mockResolvedValueOnce(invalidProfile);

      const result = await service.generateAndStoreProfile({
        userId,
        goalId,
        goalDescription: "Run a marathon",
        language: "en",
      });

      expect(result.profile_id).toBeNull();
      expect(result.profile_status).toBe("profile_generation_failed");
      expect(aiService.generateJson).toHaveBeenCalledTimes(2);
    });
  });
});
