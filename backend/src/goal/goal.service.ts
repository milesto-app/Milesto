import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import { AiService } from "../ai/ai.service.js";
import { UserLanguageService } from "../common/user-language.service.js";
import type { Database, Json } from "../supabase/database.types.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import { UsageService } from "../usage/usage.service.js";
import { GenerationType } from "../usage/usage.types.js";
import {
  GOAL_STATUS,
  PROFILE_VIEWABLE_STATUSES,
} from "./goal-status.constants.js";
import {
  buildGoalTitleSystemPrompt,
  buildGoalTitleUserPrompt,
} from "./prompts/goal-title-prompt.js";

type GoalRow = Database["public"]["Tables"]["goals"]["Row"];

export interface GoalProfileResult {
  id: string;
  goal_id: string;
  profile_data: Json | null;
  narrative_summary: string | null;
  created_at: string | null;
}

@Injectable()
export class GoalService {
  private readonly logger = new Logger(GoalService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly aiService: AiService,
    private readonly usageService: UsageService,
    private readonly languageService: UserLanguageService,
  ) {}

  public async create(
    userId: string,
    description: string,
    title?: string,
  ): Promise<GoalRow> {
    const resolvedTitle =
      title ?? (await this.generateTitle(userId, description));
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        title: resolvedTitle,
        description,
        status: GOAL_STATUS.INTAKE_IN_PROGRESS,
        profile_generation_attempts: 0,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(
        `Failed to create goal for user ${userId}: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to create goal");
    }

    this.logger.log(`Goal ${data.id} created for user ${userId}`);
    return data;
  }

  private async generateTitle(
    userId: string,
    description: string,
  ): Promise<string> {
    const FALLBACK_MAX_LENGTH = 200;

    await this.usageService.reserveGeneration(
      userId,
      GenerationType.GOAL_TITLE,
    );
    try {
      const language = await this.languageService.getLanguage(userId);
      const result = await this.aiService.generateJson<{ title: string }>(
        buildGoalTitleSystemPrompt(language),
        buildGoalTitleUserPrompt(description),
      );
      return result.title;
    } catch (error) {
      this.logger.warn(
        `AI title generation failed, using fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      return description.substring(0, FALLBACK_MAX_LENGTH);
    }
  }

  public async findOne(userId: string, goalId: string): Promise<GoalRow> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("id", goalId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (error) {
      throw new NotFoundException("Goal not found");
    }

    return data;
  }

  public async getGoalProfile(
    userId: string,
    goalId: string,
  ): Promise<GoalProfileResult> {
    const goal = await this.findOne(userId, goalId);

    if (!PROFILE_VIEWABLE_STATUSES.includes(goal.status)) {
      throw new NotFoundException("Profile not found");
    }

    const supabase = this.supabaseService.getAdminClient();

    const { data: profile, error } = await supabase
      .from("goals")
      .select("id, profile_data, narrative_summary, profile_created_at")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (error) {
      throw new NotFoundException("Profile not found");
    }

    return {
      id: profile.id,
      goal_id: profile.id,
      profile_data: profile.profile_data,
      narrative_summary: profile.narrative_summary,
      created_at: profile.profile_created_at,
    };
  }

  public async setTargetDate(
    goalId: string,
    targetDate: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("goals")
      .update({ target_date: targetDate, updated_at: new Date().toISOString() })
      .eq("id", goalId)
      .is("deleted_at", null);
    if (error) {
      this.logger.error(
        `Failed to set target date for goal ${goalId}: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to set target date");
    }
  }

  public async updateStatus(goalId: string, status: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("goals")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", goalId)
      .is("deleted_at", null);
    if (error) {
      throw new InternalServerErrorException(
        `Failed to update goal status: ${error.message}`,
      );
    }
  }
}
