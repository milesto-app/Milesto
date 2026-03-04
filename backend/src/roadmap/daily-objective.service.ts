import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserLanguageService } from '../common/user-language.service.js';
import { ContextPipelineService } from './context-pipeline.service.js';
import { GenerationService } from './generation.service.js';
import { DailyObjectiveStorageService } from './daily-objective-storage.service.js';
import { WeeklyPlanService } from './weekly-plan.service.js';
import type { DailyObjective, EnergyLevel } from './types/daily.types.js';
import type { WeeklyPlan } from './types/weekly-plan.types.js';
import type { UpdateParams } from './daily-objective-storage.service.js';

interface GenerateParams {
  weeklyPlan: WeeklyPlan;
  goalId: string;
  userId: string;
  energyLevel: EnergyLevel;
  today: string;
  language: string;
}

interface FallbackParams {
  plan: WeeklyPlan;
  goalId: string;
  userId: string;
  today: string;
}

@Injectable()
export class DailyObjectiveService {
  private readonly logger = new Logger(DailyObjectiveService.name);

  // eslint-disable-next-line max-params
  constructor(
    private readonly contextPipeline: ContextPipelineService,
    private readonly generation: GenerationService,
    private readonly storage: DailyObjectiveStorageService,
    private readonly events: EventEmitter2,
    private readonly weeklyPlan: WeeklyPlanService,
    private readonly languageService: UserLanguageService,
  ) {}

  public async getDailyObjectives(
    goalId: string,
    userId: string,
    date?: string,
  ): Promise<DailyObjective[]> {
    const today = date ?? new Date().toISOString().split('T')[0] ?? '';

    const existing = await this.storage.getExistingObjectives(
      goalId,
      userId,
      today,
    );
    if (existing.length > 0) {
      return existing;
    }

    const checkIn = await this.storage.getCheckIn(goalId, userId, today);
    if (checkIn === null) {
      throw new BadRequestException(
        'A morning check-in is required before daily objectives can be generated',
      );
    }

    return this.generateForDay({
      goalId,
      userId,
      energyLevel: checkIn.energy_level,
      today,
    });
  }

  public async updateDailyObjective(
    params: UpdateParams,
  ): Promise<DailyObjective> {
    return this.storage.updateObjective(params);
  }

  public async getWeeklyCompletionRate(
    goalId: string,
    userId: string,
    weeklyPlanId: string,
  ): Promise<{ completed: number; total: number; rate: number }> {
    return this.storage.getWeeklyCompletionRate(goalId, userId, weeklyPlanId);
  }

  private async generateForDay(params: {
    goalId: string;
    userId: string;
    energyLevel: EnergyLevel;
    today: string;
  }): Promise<DailyObjective[]> {
    const plan = await this.weeklyPlan.getCurrentWeeklyPlan(
      params.goalId,
      params.userId,
    );
    if (plan === null) {
      throw new BadRequestException(
        'No active weekly plan found. Generate a weekly plan first.',
      );
    }

    const language = await this.languageService.getLanguage(params.userId);

    try {
      return await this.generateAndStore({
        weeklyPlan: plan,
        goalId: params.goalId,
        userId: params.userId,
        energyLevel: params.energyLevel,
        today: params.today,
        language,
      });
    } catch (error) {
      this.logger.warn(
        `Daily objectives generation failed, creating fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.createFallbackOrThrow({
        plan,
        goalId: params.goalId,
        userId: params.userId,
        today: params.today,
      });
    }
  }

  private async generateAndStore(
    params: GenerateParams,
  ): Promise<DailyObjective[]> {
    const weekData = await this.weeklyPlan.queryWeekData(
      params.weeklyPlan,
      params.goalId,
    );
    const context = await this.contextPipeline.assembleContext(
      params.goalId,
      params.userId,
    );

    const { objectives } = await this.generation.generateDailyObjectives({
      weeklyPlan: params.weeklyPlan,
      energyLevel: params.energyLevel,
      context,
      weekData: {
        completedObjectives: weekData.objectivesCompleted,
        totalObjectives: weekData.objectivesTotal,
        debriefNotes: weekData.debriefNotes,
      },
      language: params.language,
    });

    const stored = await this.storage.storeObjectives({
      objectives: objectives.map((obj) => ({
        title: obj.title,
        description: obj.description,
        order_index: obj.order_index,
        difficulty_rating: obj.difficulty_rating ?? null,
      })),
      weeklyPlanId: params.weeklyPlan.id,
      goalId: params.goalId,
      userId: params.userId,
      date: params.today,
      isFallback: false,
    });

    this.events.emit('daily-objectives.generated', {
      goalId: params.goalId,
      date: params.today,
    });
    return stored;
  }

  private async createFallbackOrThrow(
    params: FallbackParams,
  ): Promise<DailyObjective[]> {
    try {
      return await this.createFallbackObjectives(params);
    } catch (fallbackError) {
      this.logger.error(
        `Fallback objectives creation also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
      );
      throw new InternalServerErrorException(
        'Daily objectives generation failed',
      );
    }
  }

  private async createFallbackObjectives(
    params: FallbackParams,
  ): Promise<DailyObjective[]> {
    this.logger.warn(
      `Creating fallback daily objectives from weekly plan for goal ${params.goalId}`,
    );
    const objectives = params.plan.objectives.map((obj, i) => ({
      title: obj,
      description: obj,
      order_index: i + 1,
      difficulty_rating: null,
    }));

    return this.storage.storeObjectives({
      objectives,
      weeklyPlanId: params.plan.id,
      goalId: params.goalId,
      userId: params.userId,
      date: params.today,
      isFallback: true,
    });
  }
}
