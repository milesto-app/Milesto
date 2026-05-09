import { BadRequestException, Injectable, Logger } from "@nestjs/common";

import { UserLanguageService } from "../common/user-language.service.js";
import { GoalService } from "../goal/goal.service.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import { UsageService } from "../usage/usage.service.js";
import { GenerationType } from "../usage/usage.types.js";
import { ROADMAP_STATUS } from "./constants/roadmap.constants.js";
import { RoadmapContextService } from "./roadmap-context.service.js";
import { RoadmapDataService } from "./roadmap-data.service.js";
import { RoadmapGenerationService } from "./roadmap-generation.service.js";
import type {
  GoalData,
  MilestoneSummary,
  Roadmap,
} from "./types/roadmap.types.js";

@Injectable()
export class RoadmapService {
  private readonly logger = new Logger(RoadmapService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly contextPipeline: RoadmapContextService,
    private readonly generation: RoadmapGenerationService,
    private readonly goal: GoalService,
    private readonly roadmapStorage: RoadmapDataService,
    private readonly languageService: UserLanguageService,
    private readonly usageService: UsageService,
  ) {}

  public async generateMilestones(
    goalId: string,
    userId: string,
  ): Promise<Roadmap> {
    const goalData = await this.validateGoalStatus(goalId, userId);
    const roadmap = await this.roadmapStorage.acquireGenerationLock(
      goalId,
      userId,
    );

    try {
      await this.usageService.reserveGeneration(
        userId,
        GenerationType.MILESTONE_ROADMAP,
      );
    } catch (error) {
      await this.roadmapStorage.updateRoadmapStatus(
        goalId,
        ROADMAP_STATUS.FAILED,
        undefined,
      );
      throw error;
    }

    void this.runGeneration(goalId, userId, goalData);

    return roadmap;
  }

  private async runGeneration(
    goalId: string,
    userId: string,
    goalData: GoalData,
  ): Promise<void> {
    try {
      const context = await this.contextPipeline.assembleContext(
        goalId,
        userId,
      );
      const fullGoalData = await this.buildGoalData(goalData, goalId, userId);
      const language = await this.languageService.getLanguage(userId);
      const { milestones, metadata } = await this.generation.generateMilestones(
        context,
        fullGoalData,
        language,
      );
      await this.usageService.record(userId, GenerationType.MILESTONE_ROADMAP, {
        promptTokens: metadata.prompt_tokens,
        completionTokens: metadata.completion_tokens,
        model: metadata.model_used,
      });

      await this.roadmapStorage.storeMilestones(goalId, milestones);
      await this.roadmapStorage.updateRoadmapStatus(
        goalId,
        ROADMAP_STATUS.COMPLETE,
        metadata,
      );
      await this.goal.updateStatus(goalId, "active");

      this.logger.log(
        `Roadmap generated for goal ${goalId}: ${String(milestones.length)} milestones`,
      );
    } catch (error) {
      this.logger.error(
        `Roadmap generation failed for goal ${goalId}`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.roadmapStorage.updateRoadmapStatus(
        goalId,
        ROADMAP_STATUS.FAILED,
        undefined,
      );
    }
  }

  public async getRoadmap(goalId: string, userId: string): Promise<Roadmap> {
    return this.roadmapStorage.getRoadmap(goalId, userId);
  }

  public async getMilestones(
    goalId: string,
    userId: string,
  ): Promise<MilestoneSummary[]> {
    return this.roadmapStorage.getMilestones(goalId, userId);
  }

  private async buildGoalData(
    goalData: GoalData,
    goalId: string,
    userId: string,
  ): Promise<GoalData> {
    let profileData: Record<string, unknown> | undefined;
    try {
      const supabase = this.supabaseService.getAdminClient();
      const { data: profile } = await supabase
        .from("goals")
        .select("profile_data")
        .eq("id", goalId)
        .eq("user_id", userId)
        .single();
      profileData =
        (profile?.profile_data as Record<string, unknown> | null | undefined) ??
        undefined;
    } catch (error) {
      this.logger.warn(
        `Could not fetch goal profile for constraints: ${goalId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      id: goalData.id,
      title: goalData.title,
      description: goalData.description,
      status: goalData.status,
      ...(goalData.target_date !== undefined
        ? { target_date: goalData.target_date }
        : {}),
      ...(profileData !== undefined ? { profile_data: profileData } : {}),
    };
  }

  private async validateGoalStatus(
    goalId: string,
    userId: string,
  ): Promise<GoalData> {
    const foundGoal = await this.goal.findOne(userId, goalId);
    const GENERATION_ALLOWED_STATUSES = ["intake_completed", "active"];
    if (!GENERATION_ALLOWED_STATUSES.includes(foundGoal.status)) {
      throw new BadRequestException(
        `Goal must be in intake_completed or active status, current: ${foundGoal.status}`,
      );
    }
    return foundGoal as GoalData;
  }
}
