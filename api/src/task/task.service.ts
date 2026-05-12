import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";

import { UserLanguageService } from "../common/user-language.service.js";
import { MilestoneService } from "../roadmap/milestone.service.js";
import { RoadmapContextService } from "../roadmap/roadmap-context.service.js";
import type { UpdateTaskParams } from "../roadmap/roadmap-data.service.js";
import { RoadmapDataService } from "../roadmap/roadmap-data.service.js";
import { RoadmapGenerationService } from "../roadmap/roadmap-generation.service.js";
import type { Milestone } from "../roadmap/types/roadmap.types.js";
import type { Task } from "../roadmap/types/task.types.js";
import { UsageService } from "../usage/usage.service.js";
import { GenerationType } from "../usage/usage.types.js";

interface GenerateParams {
  milestone: Milestone;
  goalId: string;
  userId: string;
  language: string;
}

interface FallbackParams {
  milestone: Milestone;
  goalId: string;
  userId: string;
}

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private readonly contextPipeline: RoadmapContextService,
    private readonly generation: RoadmapGenerationService,
    private readonly storage: RoadmapDataService,
    private readonly milestoneService: MilestoneService,
    private readonly languageService: UserLanguageService,
    private readonly usageService: UsageService,
  ) {}

  public async getTasks(goalId: string, userId: string): Promise<Task[]> {
    const weekState = await this.milestoneService.getCurrentMilestone(
      goalId,
      userId,
    );
    if (weekState.milestone === null) {
      throw new BadRequestException(
        "No active milestone found. Activate a milestone first.",
      );
    }

    const existing = await this.storage.getExistingTasksForMilestone(
      goalId,
      userId,
      weekState.milestone.id,
    );
    if (existing.length > 0) {
      return existing;
    }

    return this.generateForMilestone({
      goalId,
      userId,
      milestone: weekState.milestone,
    });
  }

  public async generateTasks(goalId: string, userId: string): Promise<Task[]> {
    const weekState = await this.milestoneService.getCurrentMilestone(
      goalId,
      userId,
    );
    if (weekState.milestone === null) {
      throw new BadRequestException(
        "No active milestone found. Activate a milestone first.",
      );
    }

    return this.generateForMilestone({
      goalId,
      userId,
      milestone: weekState.milestone,
    });
  }

  public async toggleTaskCompletion(params: UpdateTaskParams): Promise<Task> {
    const { task } = await this.storage.updateTask(params);
    return task;
  }

  public async getTaskCompletionRate(
    goalId: string,
    userId: string,
    milestoneId: string,
  ): Promise<{ completed: number; total: number; rate: number }> {
    return this.storage.getTaskCompletionRate(goalId, userId, milestoneId);
  }

  private async generateForMilestone(params: {
    goalId: string;
    userId: string;
    milestone: Milestone;
  }): Promise<Task[]> {
    const language = await this.languageService.getLanguage(params.userId);

    try {
      return await this.generateAndStore({
        milestone: params.milestone,
        goalId: params.goalId,
        userId: params.userId,
        language,
      });
    } catch (error) {
      this.logger.warn(
        `Task generation failed, creating fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.createFallbackOrThrow({
        milestone: params.milestone,
        goalId: params.goalId,
        userId: params.userId,
      });
    }
  }

  private async generateAndStore(params: GenerateParams): Promise<Task[]> {
    await this.usageService.reserveGeneration(
      params.userId,
      GenerationType.DAILY_OBJECTIVES,
    );
    const weekData = await this.milestoneService.queryWeekDataForMilestone(
      params.milestone,
      params.goalId,
    );
    const context = await this.contextPipeline.assembleContext(
      params.goalId,
      params.userId,
    );

    const { tasks, metadata } = await this.generation.generateTasks({
      milestone: params.milestone,
      context,
      weekData,
      language: params.language,
    });
    await this.usageService.record(
      params.userId,
      GenerationType.DAILY_OBJECTIVES,
      {
        promptTokens: metadata.prompt_tokens,
        completionTokens: metadata.completion_tokens,
        model: metadata.model_used,
      },
    );

    const stored = await this.storage.storeTasks({
      tasks: tasks.map((task) => ({
        title: task.title,
        description: task.description,
        order_index: task.order_index,
        estimated_minutes: task.estimated_minutes ?? null,
      })),
      milestoneId: params.milestone.id,
      goalId: params.goalId,
      userId: params.userId,
      isFallback: false,
    });

    return stored;
  }

  private async createFallbackOrThrow(params: FallbackParams): Promise<Task[]> {
    try {
      return await this.createFallbackTasks(params);
    } catch (fallbackError) {
      this.logger.error(
        `Fallback tasks creation also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
      );
      throw new InternalServerErrorException("Task generation failed");
    }
  }

  private async createFallbackTasks(params: FallbackParams): Promise<Task[]> {
    this.logger.warn(
      `Creating fallback tasks from milestone for goal ${params.goalId}`,
    );
    const tasks = [
      {
        title: params.milestone.title,
        description: params.milestone.description,
        order_index: 1,
        estimated_minutes: null,
      },
    ];

    return this.storage.storeTasks({
      tasks,
      milestoneId: params.milestone.id,
      goalId: params.goalId,
      userId: params.userId,
      isFallback: true,
    });
  }
}
