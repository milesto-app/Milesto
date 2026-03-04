import { Injectable, Logger } from '@nestjs/common';

import { UserLanguageService } from '../common/user-language.service.js';
import { ContextPipelineService } from './context-pipeline.service.js';
import { GenerationService } from './generation.service.js';
import type { Milestone, Roadmap } from './types/roadmap.types.js';
import type {
  GenerateAndStoreParams,
  GenerationContext,
  MonthlySummary,
  WeekData,
  WeeklyPlan,
} from './types/weekly-plan.types.js';
import { WeeklyPlanDataService } from './weekly-plan-data.service.js';
import {
  formatMonthlySummaryForEmbedding,
  formatSummaryForEmbedding,
} from './weekly-plan-format.js';
import { WeeklyPlanQueryService } from './weekly-plan-query.service.js';
import { WeeklyPlanStorageService } from './weekly-plan-storage.service.js';

const DAYS_PER_WEEK = 7;

interface WeeklyPlanDeps {
  contextPipeline: ContextPipelineService;
  generation: GenerationService;
  data: WeeklyPlanDataService;
  query: WeeklyPlanQueryService;
  storage: WeeklyPlanStorageService;
  languageService: UserLanguageService;
}

@Injectable()
export class WeeklyPlanService {
  private readonly logger = new Logger(WeeklyPlanService.name);
  private readonly deps: WeeklyPlanDeps;

  constructor(
    contextPipeline: ContextPipelineService,
    generation: GenerationService,
    data: WeeklyPlanDataService,
    query: WeeklyPlanQueryService,
    storage: WeeklyPlanStorageService,
    languageService: UserLanguageService,
  ) {
    this.deps = {
      contextPipeline,
      generation,
      data,
      query,
      storage,
      languageService,
    };
  }

  public async getCurrentWeeklyPlan(
    goalId: string,
    userId: string,
  ): Promise<WeeklyPlan | null> {
    return this.deps.storage.getCurrentWeeklyPlan(goalId, userId);
  }

  public async generateWeeklyPlan(
    goalId: string,
    userId: string,
  ): Promise<WeeklyPlan> {
    await this.deps.storage.autoCompleteExpiredPlans(goalId, DAYS_PER_WEEK);
    const language = await this.deps.languageService.getLanguage(userId);
    await this.summarizePreviousWeek(goalId, userId, language);
    await this.deps.data.generateMonthlySummaryIfNeeded({
      goalId,
      userId,
      formatFn: formatMonthlySummaryForEmbedding,
      language,
    });
    return this.buildAndGeneratePlan(goalId, userId, language);
  }

  private async buildAndGeneratePlan(
    goalId: string,
    userId: string,
    language: string,
  ): Promise<WeeklyPlan> {
    const { roadmap, milestone } = await this.getActiveRoadmapAndMilestone(
      goalId,
      userId,
    );
    const weekNumber = await this.deps.storage.calculateWeekNumber(roadmap.id);
    const lastCompleted =
      await this.deps.storage.getLastCompletedPlanWithoutSummary(goalId);
    const ms = milestone as Milestone & {
      monthly_summary?: MonthlySummary | null;
    };
    const generationContext: GenerationContext = {
      milestone_title: ms.title,
      milestone_description: ms.description,
      milestone_expected_outcome: ms.expected_outcome,
      milestone_target_month: ms.target_month,
      last_weekly_summary: lastCompleted?.summary ?? null,
      last_monthly_summary:
        (ms.monthly_summary as Record<string, unknown> | null) ?? null,
    };

    try {
      return await this.generateAndStorePlan({
        goalId,
        userId,
        roadmap,
        milestone,
        weekNumber,
        generationContext,
        language,
      });
    } catch (error) {
      this.logger.warn(
        `Weekly plan generation failed, creating fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.createFallbackOrThrow(
        milestone,
        goalId,
        userId,
        weekNumber,
        roadmap.id,
      );
    }
  }

  public async queryWeekData(
    plan: WeeklyPlan,
    goalId: string,
  ): Promise<WeekData> {
    return this.deps.query.queryWeekData(plan, goalId);
  }

  public async getActiveRoadmapAndMilestone(
    goalId: string,
    userId: string,
  ): Promise<{ roadmap: Roadmap; milestone: Milestone }> {
    return this.deps.storage.loadRoadmapAndMilestone(goalId, userId);
  }

  private async summarizePreviousWeek(
    goalId: string,
    userId: string,
    language: string,
  ): Promise<void> {
    const lastCompleted =
      await this.deps.storage.getLastCompletedPlanWithoutSummary(goalId);
    if (lastCompleted !== null) {
      await this.deps.data.generateAndStoreSummary({
        lastCompleted,
        goalId,
        userId,
        formatFn: formatSummaryForEmbedding,
        language,
      });
    }
  }

  private async generateAndStorePlan(
    params: GenerateAndStoreParams,
  ): Promise<WeeklyPlan> {
    const context = await this.deps.contextPipeline.assembleContext(
      params.goalId,
      params.userId,
    );
    const { plan: generated, metadata } =
      await this.deps.generation.generateWeeklyPlan({
        context,
        milestone: params.milestone,
        weekNumber: params.weekNumber,
        generationContext: params.generationContext,
        language: params.language,
      });

    const weeklyPlan = await this.deps.storage.storeWeeklyPlan({
      roadmap_id: params.roadmap.id,
      milestone_id: params.milestone.id,
      goal_id: params.goalId,
      user_id: params.userId,
      week_number: params.weekNumber,
      week_start_date: this.deps.storage.getCurrentWeekStart(),
      focus: generated.focus,
      objectives: generated.objectives,
      generation_context: params.generationContext as unknown as Record<
        string,
        unknown
      >,
      is_fallback: false,
      model_used: metadata.model_used,
      generation_metadata: metadata as unknown as Record<string, unknown>,
    });

    this.deps.storage.emitPlanGenerated(weeklyPlan.id, params.goalId);
    return weeklyPlan;
  }

  private async createFallbackOrThrow(
    milestone: Milestone,
    goalId: string,
    userId: string,
    weekNumber: number,
    roadmapId: string,
  ): Promise<WeeklyPlan> {
    try {
      this.logger.warn(
        `Creating fallback weekly plan for goal ${goalId}, week ${String(weekNumber)}`,
      );
      return await this.deps.storage.storeWeeklyPlan({
        roadmap_id: roadmapId,
        milestone_id: milestone.id,
        goal_id: goalId,
        user_id: userId,
        week_number: weekNumber,
        week_start_date: this.deps.storage.getCurrentWeekStart(),
        focus: milestone.description,
        objectives: [milestone.expected_outcome],
        generation_context: {},
        is_fallback: true,
        model_used: null,
        generation_metadata: {},
      });
    } catch (fallbackError) {
      this.deps.storage.warnFallbackFailed(fallbackError);
    }
  }
}
