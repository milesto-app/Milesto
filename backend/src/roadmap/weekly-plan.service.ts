import { Injectable, Logger } from '@nestjs/common';
import { ContextPipelineService } from './context-pipeline.service.js';
import { GenerationService } from './generation.service.js';
import { WeeklyPlanDataService } from './weekly-plan-data.service.js';
import { WeeklyPlanQueryService } from './weekly-plan-query.service.js';
import { WeeklyPlanStorageService } from './weekly-plan-storage.service.js';
import {
  formatSummaryForEmbedding,
  formatMonthlySummaryForEmbedding,
} from './weekly-plan-format.js';
import type { Milestone, Roadmap } from './types/roadmap.types.js';
import type {
  GenerationContext,
  MonthlySummary,
  WeekData,
  WeeklyPlan,
} from './types/weekly-plan.types.js';

const DAYS_PER_WEEK = 7;

interface GenerateAndStoreParams {
  goalId: string;
  userId: string;
  roadmap: Roadmap;
  milestone: Milestone;
  weekNumber: number;
  generationContext: GenerationContext;
}

interface FallbackParams {
  milestone: Milestone;
  goalId: string;
  userId: string;
  weekNumber: number;
  roadmapId: string;
}

interface WeeklyPlanDeps {
  contextPipeline: ContextPipelineService;
  generation: GenerationService;
  data: WeeklyPlanDataService;
  query: WeeklyPlanQueryService;
  storage: WeeklyPlanStorageService;
}

@Injectable()
export class WeeklyPlanService {
  private readonly logger = new Logger(WeeklyPlanService.name);
  private readonly deps: WeeklyPlanDeps;

  // eslint-disable-next-line max-params
  constructor(
    contextPipeline: ContextPipelineService,
    generation: GenerationService,
    data: WeeklyPlanDataService,
    query: WeeklyPlanQueryService,
    storage: WeeklyPlanStorageService,
  ) {
    this.deps = { contextPipeline, generation, data, query, storage };
  }

  public async getCurrentWeeklyPlan(goalId: string, userId: string): Promise<WeeklyPlan | null> {
    return this.deps.storage.getCurrentWeeklyPlan(goalId, userId);
  }

  public async generateWeeklyPlan(goalId: string, userId: string): Promise<WeeklyPlan> {
    await this.deps.storage.autoCompleteExpiredPlans(goalId, DAYS_PER_WEEK);
    await this.summarizePreviousWeek(goalId, userId);
    await this.deps.data.generateMonthlySummaryIfNeeded(
      goalId,
      userId,
      formatMonthlySummaryForEmbedding,
    );

    const { roadmap, milestone } = await this.getActiveRoadmapAndMilestone(goalId, userId);
    const weekNumber = await this.deps.storage.calculateWeekNumber(roadmap.id);
    const lastCompleted = await this.deps.storage.getLastCompletedPlanWithoutSummary(goalId);
    const generationContext = this.buildGenerationContext(milestone, lastCompleted);

    try {
      return await this.generateAndStorePlan({
        goalId,
        userId,
        roadmap,
        milestone,
        weekNumber,
        generationContext,
      });
    } catch (error) {
      this.logger.warn(
        `Weekly plan generation failed, creating fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.createFallbackOrThrow({
        milestone,
        goalId,
        userId,
        weekNumber,
        roadmapId: roadmap.id,
      });
    }
  }

  public async queryWeekData(plan: WeeklyPlan, goalId: string): Promise<WeekData> {
    return this.deps.query.queryWeekData(plan, goalId);
  }

  public async getActiveRoadmapAndMilestone(
    goalId: string,
    userId: string,
  ): Promise<{ roadmap: Roadmap; milestone: Milestone }> {
    return this.deps.storage.loadRoadmapAndMilestone(goalId, userId);
  }

  private async summarizePreviousWeek(goalId: string, userId: string): Promise<void> {
    const lastCompleted = await this.deps.storage.getLastCompletedPlanWithoutSummary(goalId);
    if (lastCompleted !== null) {
      await this.deps.data.generateAndStoreSummary({
        lastCompleted,
        goalId,
        userId,
        formatFn: formatSummaryForEmbedding,
      });
    }
  }

  private buildGenerationContext(
    milestone: Milestone & { monthly_summary?: MonthlySummary | null },
    lastCompleted: WeeklyPlan | null,
  ): GenerationContext {
    return {
      milestone_title: milestone.title,
      milestone_description: milestone.description,
      milestone_expected_outcome: milestone.expected_outcome,
      milestone_target_month: milestone.target_month,
      last_weekly_summary: lastCompleted?.summary ?? null,
      last_monthly_summary: (milestone.monthly_summary as Record<string, unknown> | null) ?? null,
    };
  }

  private async generateAndStorePlan(params: GenerateAndStoreParams): Promise<WeeklyPlan> {
    const context = await this.deps.contextPipeline.assembleContext(params.goalId, params.userId);
    const { plan: generated, metadata } = await this.deps.generation.generateWeeklyPlan({
      context,
      milestone: params.milestone,
      weekNumber: params.weekNumber,
      generationContext: params.generationContext,
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
      generation_context: params.generationContext as unknown as Record<string, unknown>,
      is_fallback: false,
      model_used: metadata.model_used,
      generation_metadata: metadata as unknown as Record<string, unknown>,
    });

    this.deps.storage.emitPlanGenerated(weeklyPlan.id, params.goalId);
    return weeklyPlan;
  }

  private async createFallbackOrThrow(params: FallbackParams): Promise<WeeklyPlan> {
    try {
      this.logger.warn(
        `Creating fallback weekly plan for goal ${params.goalId}, week ${String(params.weekNumber)}`,
      );
      return await this.deps.storage.storeWeeklyPlan({
        roadmap_id: params.roadmapId,
        milestone_id: params.milestone.id,
        goal_id: params.goalId,
        user_id: params.userId,
        week_number: params.weekNumber,
        week_start_date: this.deps.storage.getCurrentWeekStart(),
        focus: params.milestone.description,
        objectives: [params.milestone.expected_outcome],
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
