import { Injectable, Logger } from '@nestjs/common';
import { DailyObjectiveService } from '../roadmap/daily-objective.service.js';
import { WeeklyPlanService } from '../roadmap/weekly-plan.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { ChatSearchService } from './chat-search.service.js';
import type { ToolExecutionContext } from './types/chat.types.js';

@Injectable()
export class ChatToolsService {
  private readonly logger = new Logger(ChatToolsService.name);

  // eslint-disable-next-line max-params -- NestJS DI requires separate constructor params
  constructor(
    private readonly dailyObjectiveService: DailyObjectiveService,
    private readonly weeklyPlanService: WeeklyPlanService,
    private readonly supabaseService: SupabaseService,
    private readonly chatSearchService: ChatSearchService,
  ) {}

  public async getDailyObjectives(ctx: ToolExecutionContext): Promise<unknown> {
    try {
      const objectives = await this.dailyObjectiveService.getDailyObjectives(
        ctx.goalId,
        ctx.userId,
      );

      return objectives.map((obj) => ({
        id: obj.id,
        title: obj.title,
        description: obj.description,
        is_completed: obj.is_completed,
        difficulty_rating: obj.difficulty_rating,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`getDailyObjectives failed: ${message}`);
      return { error: 'No daily objectives available. Complete your morning check-in first.' };
    }
  }

  public async toggleObjectiveCompletion(
    args: Record<string, unknown>,
    ctx: ToolExecutionContext,
  ): Promise<unknown> {
    try {
      const objectiveId = args.objectiveId as string;

      await this.dailyObjectiveService.updateDailyObjective({
        objectiveId,
        goalId: ctx.goalId,
        userId: ctx.userId,
        isCompleted: args.isCompleted as boolean,
      });

      return { success: true, objectiveId, isCompleted: args.isCompleted };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`toggleObjectiveCompletion failed: ${message}`);
      return { error: 'Unable to update the objective. It may not exist or belong to this goal.' };
    }
  }

  public async getProgressStats(ctx: ToolExecutionContext): Promise<unknown> {
    try {
      const plan = await this.weeklyPlanService.getCurrentWeeklyPlan(ctx.goalId, ctx.userId);

      if (plan === null) {
        return { error: 'No active weekly plan found. Generate a weekly plan first.' };
      }

      const stats = await this.dailyObjectiveService.getWeeklyCompletionRate(
        ctx.goalId,
        ctx.userId,
        plan.id,
      );

      return {
        completed: stats.completed,
        total: stats.total,
        rate: stats.rate,
        week_number: plan.week_number,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`getProgressStats failed: ${message}`);
      return { error: 'Unable to fetch progress stats.' };
    }
  }

  public async editMemory(
    args: Record<string, unknown>,
    ctx: ToolExecutionContext,
  ): Promise<unknown> {
    try {
      const content = args.content as string;
      const supabase = this.supabaseService.getAdminClient();

      const { error } = await supabase.from('coach_memories').upsert(
        {
          user_id: ctx.userId,
          goal_id: ctx.goalId,
          content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,goal_id' },
      );

      if (error !== null) {
        this.logger.warn(`editMemory upsert failed: ${error.message}`);
        return { error: 'Unable to save memory.' };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`editMemory failed: ${message}`);
      return { error: 'Unable to save memory.' };
    }
  }

  public async saveInsight(
    args: Record<string, unknown>,
    ctx: ToolExecutionContext,
  ): Promise<unknown> {
    try {
      const insight = args.insight as string;

      return await this.chatSearchService.saveInsight({
        insight,
        goalId: ctx.goalId,
        userId: ctx.userId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`saveInsight failed: ${message}`);
      return { error: 'Unable to save insight.' };
    }
  }

  public async searchContext(
    args: Record<string, unknown>,
    ctx: ToolExecutionContext,
  ): Promise<unknown> {
    try {
      const query = args.query as string;
      const contentTypes = args.contentTypes as string[] | undefined;

      return await this.chatSearchService.search({
        query,
        goalId: ctx.goalId,
        userId: ctx.userId,
        contentTypes,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`searchContext failed: ${message}`);
      return { error: 'Unable to search context. Please try rephrasing your question.' };
    }
  }
}
