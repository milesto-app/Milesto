import { Injectable, Logger } from "@nestjs/common";

import { MilestoneService } from "../roadmap/milestone.service.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import { TaskService } from "../task/task.service.js";
import { ChatSearchService } from "./chat-search.service.js";
import type { ToolExecutionContext } from "./types/chat.types.js";

@Injectable()
export class ChatToolsService {
  private readonly logger = new Logger(ChatToolsService.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly milestoneService: MilestoneService,
    private readonly supabaseService: SupabaseService,
    private readonly chatSearchService: ChatSearchService,
  ) {}

  public async getTasks(ctx: ToolExecutionContext): Promise<unknown> {
    try {
      const tasks = await this.taskService.getTasks(ctx.goalId, ctx.userId);

      return tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        completed_at: task.completed_at,
        estimated_minutes: task.estimated_minutes,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`getTasks failed: ${message}`);
      return {
        error: "No tasks available. A milestone needs to be activated first.",
      };
    }
  }

  public async toggleTaskCompletion(
    args: Record<string, unknown>,
    ctx: ToolExecutionContext,
  ): Promise<unknown> {
    try {
      const taskId = args.taskId as string;

      await this.taskService.toggleTaskCompletion({
        taskId,
        goalId: ctx.goalId,
        userId: ctx.userId,
        isCompleted: args.isCompleted as boolean,
      });

      return { success: true, taskId, isCompleted: args.isCompleted };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`toggleTaskCompletion failed: ${message}`);
      return {
        error:
          "Unable to update the task. It may not exist or belong to this goal.",
      };
    }
  }

  public async getProgressStats(ctx: ToolExecutionContext): Promise<unknown> {
    try {
      const weekState = await this.milestoneService.getCurrentMilestone(
        ctx.goalId,
        ctx.userId,
      );

      if (weekState.milestone === null) {
        return {
          error: "No active milestone found. Activate a milestone first.",
        };
      }

      const stats = await this.taskService.getTaskCompletionRate(
        ctx.goalId,
        ctx.userId,
        weekState.milestone.id,
      );

      return {
        completed: stats.completed,
        total: stats.total,
        rate: stats.rate,
        milestone_title: weekState.milestone.title,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`getProgressStats failed: ${message}`);
      return { error: "Unable to fetch progress stats." };
    }
  }

  public async editMemory(
    args: Record<string, unknown>,
    ctx: ToolExecutionContext,
  ): Promise<unknown> {
    try {
      const content = args.content as string;
      const supabase = this.supabaseService.getAdminClient();

      const { error } = await supabase.from("coach_memories").upsert(
        {
          user_id: ctx.userId,
          goal_id: ctx.goalId,
          content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,goal_id" },
      );

      if (error !== null) {
        this.logger.warn(`editMemory upsert failed: ${error.message}`);
        return { error: "Unable to save memory." };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`editMemory failed: ${message}`);
      return { error: "Unable to save memory." };
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
      return { error: "Unable to save insight." };
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
      return {
        error: "Unable to search context. Please try rephrasing your question.",
      };
    }
  }
}
