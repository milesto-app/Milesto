import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { AiService } from '../ai/ai.service.js';
import type { Database } from '../supabase/database.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import {
  DELETABLE_STATUSES,
  GOAL_STATUS,
  PROFILE_VIEWABLE_STATUSES,
} from './goal-status.constants.js';
import {
  buildGoalTitleSystemPrompt,
  buildGoalTitleUserPrompt,
} from './prompts/goal-title-prompt.js';

type GoalRow = Database['public']['Tables']['goals']['Row'];

interface GoalListResult {
  data: GoalRow[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class GoalService {
  private readonly logger = new Logger(GoalService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly aiService: AiService,
  ) {}

  public async create(
    userId: string,
    description: string,
    title?: string,
  ): Promise<GoalRow> {
    const resolvedTitle = title ?? (await this.generateTitle(description));
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('goals')
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
      throw new InternalServerErrorException('Failed to create goal');
    }

    this.logger.log(`Goal ${data.id} created for user ${userId}`);
    return data;
  }

  private async generateTitle(description: string): Promise<string> {
    const TITLE_TIMEOUT_MS = 10_000;
    const FALLBACK_MAX_LENGTH = 200;

    try {
      const result = await this.aiService.generateJSON<{ title: string }>(
        buildGoalTitleSystemPrompt(),
        buildGoalTitleUserPrompt(description),
        undefined,
        { timeoutMs: TITLE_TIMEOUT_MS },
      );
      return result.title;
    } catch (error) {
      this.logger.warn(
        `AI title generation failed, using fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      return description.substring(0, FALLBACK_MAX_LENGTH);
    }
  }

  public async findAll(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<GoalListResult> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error, count } = await supabase
      .from('goals')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error(
        `Failed to list goals for user ${userId}: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to list goals');
    }

    return { data, total: count ?? 0, limit, offset };
  }

  public async findOne(userId: string, goalId: string): Promise<GoalRow> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();

    if (error) {
      throw new NotFoundException('Goal not found');
    }

    return data;
  }

  public async getGoalProfile(
    userId: string,
    goalId: string,
  ): Promise<
    Pick<
      Database['public']['Tables']['goal_profiles']['Row'],
      'id' | 'goal_id' | 'profile_data' | 'narrative_summary' | 'created_at'
    >
  > {
    const goal = await this.findOne(userId, goalId);

    if (!PROFILE_VIEWABLE_STATUSES.includes(goal.status)) {
      throw new NotFoundException('Profile not found');
    }

    const supabase = this.supabaseService.getAdminClient();

    const { data: profile, error } = await supabase
      .from('goal_profiles')
      .select('id, goal_id, profile_data, narrative_summary, created_at')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .single();

    if (error) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  public async setTargetDate(
    goalId: string,
    targetDate: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from('goals')
      .update({ target_date: targetDate, updated_at: new Date().toISOString() })
      .eq('id', goalId);
    if (error) {
      this.logger.error(
        `Failed to set target date for goal ${goalId}: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to set target date');
    }
  }

  public async updateStatus(goalId: string, status: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from('goals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', goalId);
    if (error) {
      throw new InternalServerErrorException(
        `Failed to update goal status: ${error.message}`,
      );
    }
  }

  public async delete(userId: string, goalId: string): Promise<void> {
    const goal = await this.findOne(userId, goalId);

    if (!DELETABLE_STATUSES.includes(goal.status)) {
      throw new BadRequestException(
        `Cannot delete a goal in '${goal.status}' status`,
      );
    }

    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error(
        `Failed to delete goal ${goalId} for user ${userId}: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to delete goal');
    }

    this.logger.log(`Goal ${goalId} deleted for user ${userId}`);
  }
}
