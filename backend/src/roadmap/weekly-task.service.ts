import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { UserLanguageService } from "../common/user-language.service.js";
import { ContextPipelineService } from "./context-pipeline.service.js";
import { GenerationService } from "./generation.service.js";
import type { WeeklyPlan } from "./types/weekly-plan.types.js";
import type { WeeklyTask } from "./types/weekly-task.types.js";
import { WeeklyPlanService } from "./weekly-plan.service.js";
import type { UpdateTaskParams } from "./weekly-task-storage.service.js";
import { WeeklyTaskStorageService } from "./weekly-task-storage.service.js";

interface GenerateParams {
  weeklyPlan: WeeklyPlan;
  goalId: string;
  userId: string;
  language: string;
}

interface FallbackParams {
  plan: WeeklyPlan;
  goalId: string;
  userId: string;
}

@Injectable()
export class WeeklyTaskService {
  private readonly logger = new Logger(WeeklyTaskService.name);

  constructor(
    private readonly contextPipeline: ContextPipelineService,
    private readonly generation: GenerationService,
    private readonly storage: WeeklyTaskStorageService,
    private readonly events: EventEmitter2,
    private readonly weeklyPlan: WeeklyPlanService,
    private readonly languageService: UserLanguageService,
  ) {}

  public async getWeeklyTasks(
    goalId: string,
    userId: string,
  ): Promise<WeeklyTask[]> {
    const plan = await this.weeklyPlan.getCurrentWeeklyPlan(goalId, userId);
    if (plan === null) {
      throw new BadRequestException(
        "No active weekly plan found. Generate a weekly plan first.",
      );
    }

    const existing = await this.storage.getExistingTasks(
      goalId,
      userId,
      plan.id,
    );
    if (existing.length > 0) {
      return existing;
    }

    return this.generateForWeek({ goalId, userId, weeklyPlan: plan });
  }

  public async generateWeeklyTasks(
    goalId: string,
    userId: string,
  ): Promise<WeeklyTask[]> {
    const plan = await this.weeklyPlan.getCurrentWeeklyPlan(goalId, userId);
    if (plan === null) {
      throw new BadRequestException(
        "No active weekly plan found. Generate a weekly plan first.",
      );
    }

    return this.generateForWeek({ goalId, userId, weeklyPlan: plan });
  }

  public async toggleTaskCompletion(
    params: UpdateTaskParams,
  ): Promise<WeeklyTask> {
    return this.storage.updateTask(params);
  }

  public async getWeeklyCompletionRate(
    goalId: string,
    userId: string,
    weeklyPlanId: string,
  ): Promise<{ completed: number; total: number; rate: number }> {
    return this.storage.getWeeklyCompletionRate(goalId, userId, weeklyPlanId);
  }

  private async generateForWeek(params: {
    goalId: string;
    userId: string;
    weeklyPlan: WeeklyPlan;
  }): Promise<WeeklyTask[]> {
    const language = await this.languageService.getLanguage(params.userId);

    try {
      return await this.generateAndStore({
        weeklyPlan: params.weeklyPlan,
        goalId: params.goalId,
        userId: params.userId,
        language,
      });
    } catch (error) {
      this.logger.warn(
        `Weekly tasks generation failed, creating fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.createFallbackOrThrow({
        plan: params.weeklyPlan,
        goalId: params.goalId,
        userId: params.userId,
      });
    }
  }

  private async generateAndStore(
    params: GenerateParams,
  ): Promise<WeeklyTask[]> {
    const weekData = await this.weeklyPlan.queryWeekData(
      params.weeklyPlan,
      params.goalId,
    );
    const context = await this.contextPipeline.assembleContext(
      params.goalId,
      params.userId,
    );

    const { tasks } = await this.generation.generateWeeklyTasks({
      weeklyPlan: params.weeklyPlan,
      context,
      weekData,
      language: params.language,
    });

    const stored = await this.storage.storeTasks({
      tasks: tasks.map((task) => ({
        title: task.title,
        description: task.description,
        order_index: task.order_index,
        difficulty_rating: task.difficulty_rating ?? null,
      })),
      weeklyPlanId: params.weeklyPlan.id,
      goalId: params.goalId,
      userId: params.userId,
      isFallback: false,
    });

    this.events.emit("weekly-tasks.generated", {
      goalId: params.goalId,
      weeklyPlanId: params.weeklyPlan.id,
    });
    return stored;
  }

  private async createFallbackOrThrow(
    params: FallbackParams,
  ): Promise<WeeklyTask[]> {
    try {
      return await this.createFallbackTasks(params);
    } catch (fallbackError) {
      this.logger.error(
        `Fallback tasks creation also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
      );
      throw new InternalServerErrorException("Weekly tasks generation failed");
    }
  }

  private async createFallbackTasks(
    params: FallbackParams,
  ): Promise<WeeklyTask[]> {
    this.logger.warn(
      `Creating fallback weekly tasks from weekly plan for goal ${params.goalId}`,
    );
    const tasks = params.plan.objectives.map((obj, i) => ({
      title: obj,
      description: obj,
      order_index: i + 1,
      difficulty_rating: null,
    }));

    return this.storage.storeTasks({
      tasks,
      weeklyPlanId: params.plan.id,
      goalId: params.goalId,
      userId: params.userId,
      isFallback: true,
    });
  }
}
