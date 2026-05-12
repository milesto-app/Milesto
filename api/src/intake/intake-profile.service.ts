import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";

import { AiService } from "../ai/ai.service.js";
import { UserLanguageService } from "../common/user-language.service.js";
import { config } from "../config/app.config.js";
import type { GoalProfile } from "../config/questions.config.js";
import { GoalService } from "../goal/goal.service.js";
import type { Json } from "../supabase/database.types.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import { UsageService } from "../usage/usage.service.js";
import { GenerationType } from "../usage/usage.types.js";
import { IntakeDataService } from "./intake-data.service.js";
import { validateGoalProfile } from "./intake-validators.js";
import {
  buildProfileSystemPrompt,
  buildProfileUserPrompt,
} from "./prompts/profile-prompts.js";
import type {
  ProfileGenParams,
  ProfileResult,
  StoreProfileParams,
} from "./types/intake.types.js";

const FAILED_STATUS = "profile_generation_failed";

@Injectable()
export class IntakeProfileService {
  private readonly logger = new Logger(IntakeProfileService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly goalService: GoalService,
  ) {}

  @Inject()
  private readonly languageService!: UserLanguageService;

  @Inject()
  private readonly aiService!: AiService;

  @Inject()
  private readonly dataService!: IntakeDataService;

  @Inject()
  private readonly usageService!: UsageService;

  public async retryProfile(
    userId: string,
    goalId: string,
  ): Promise<{ profile_id: string | null; goal_status: string }> {
    const goal = await this.goalService.findOne(userId, goalId);
    if (goal.status !== FAILED_STATUS) {
      throw new BadRequestException(
        "Profile retry is only available for goals with failed profile generation",
      );
    }
    if (goal.profile_generation_attempts >= config.intake.maxProfileRetries) {
      throw new BadRequestException(
        `Maximum profile generation attempts (${String(config.intake.maxProfileRetries)}) exceeded`,
      );
    }
    this.logger.log(
      `Retrying profile for goal ${goalId} (attempt ${String(goal.profile_generation_attempts + 1)}/${String(config.intake.maxProfileRetries)})`,
    );
    const language = await this.languageService.getLanguage(userId);
    const result = await this.generateAndStoreProfile({
      userId,
      goalId,
      goalDescription: goal.description,
      language,
    });
    return {
      profile_id: result.profile_id,
      goal_status: result.profile_status,
    };
  }

  public async generateAndStoreProfile(
    params: StoreProfileParams,
  ): Promise<ProfileResult> {
    try {
      await this.dataService.updateGoalStatus(
        params.goalId,
        "profile_generating",
      );
      const priorBatches = await this.dataService.loadPriorBatchContext(
        params.goalId,
      );
      const genParams: ProfileGenParams = { ...params, priorBatches };
      await this.usageService.reserveGeneration(
        params.userId,
        GenerationType.GOAL_PROFILE,
      );
      const profile = await this.tryGenerateProfile(genParams);
      if (profile === null) {
        return { profile_id: null, profile_status: FAILED_STATUS };
      }
      return await this.storeProfile(params.goalId, profile);
    } catch (error) {
      this.logger.error(
        `Profile generation failed for goal ${params.goalId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.dataService.markProfileFailure(params.goalId);
    }
  }

  private async tryGenerateProfile(
    params: ProfileGenParams,
  ): Promise<GoalProfile | null> {
    let profile: GoalProfile;
    try {
      profile = await this.callProfileAi(params);
    } catch (error) {
      this.logger.error(
        `Profile AI call failed for goal ${params.goalId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.dataService.markProfileFailure(params.goalId);
      return null;
    }
    const validation = validateGoalProfile(profile);
    if (validation.valid) {
      return profile;
    }
    this.logger.warn(
      `Profile validation failed for goal ${params.goalId}: ${validation.errors.join(", ")}. Retrying...`,
    );
    return this.callAiWithValidation(params);
  }

  private async callAiWithValidation(
    params: ProfileGenParams,
  ): Promise<GoalProfile | null> {
    try {
      const profile = await this.callProfileAi(params);
      const validation = validateGoalProfile(profile);
      if (!validation.valid) {
        this.logger.error(
          `Profile validation failed after retry for goal ${params.goalId}: ${validation.errors.join(", ")}`,
        );
        await this.dataService.markProfileFailure(params.goalId);
        return null;
      }
      return profile;
    } catch (error) {
      this.logger.error(
        `Profile retry AI call failed for goal ${params.goalId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.dataService.markProfileFailure(params.goalId);
      return null;
    }
  }

  private async callProfileAi(params: ProfileGenParams): Promise<GoalProfile> {
    const systemPrompt = buildProfileSystemPrompt(params.language);
    const userPrompt = buildProfileUserPrompt({
      goalDescription: params.goalDescription,
      priorBatches: params.priorBatches,
    });
    const { data, usage } = await this.aiService.generateJson<GoalProfile>(
      systemPrompt,
      userPrompt,
      config.intake.model,
      "high",
    );
    await this.usageService.record(params.userId, GenerationType.GOAL_PROFILE, {
      promptTokens: usage?.promptTokens,
      completionTokens: usage?.completionTokens,
      model: usage?.model,
    });
    return data;
  }

  private async storeProfile(
    goalId: string,
    profile: GoalProfile,
  ): Promise<ProfileResult> {
    const client = this.supabaseService.getAdminClient();
    const { error } = await client
      .from("goals")
      .update({
        profile_data: this.buildProfileData(profile) as Json,
        narrative_summary: profile.narrative_summary,
        profile_created_at: new Date().toISOString(),
      })
      .eq("id", goalId);
    if (error !== null) {
      this.logger.error(
        `Failed to store profile for goal ${goalId}: ${error.message}`,
      );
      return this.dataService.markProfileFailure(goalId);
    }
    await this.dataService.updateGoalStatus(goalId, "intake_completed");
    this.logger.log(`Profile generated and stored for goal ${goalId}`);
    return { profile_id: goalId, profile_status: "intake_completed" };
  }

  private buildProfileData(profile: GoalProfile): Record<string, unknown> {
    return {
      current_state: profile.current_state,
      desired_state: profile.desired_state,
      constraints: profile.constraints,
      motivation: profile.motivation,
      domain_context: profile.domain_context,
      ...(profile.goal_specific_insights !== undefined && {
        goal_specific_insights: profile.goal_specific_insights,
      }),
    };
  }
}
