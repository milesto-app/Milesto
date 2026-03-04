import { Injectable, Logger } from '@nestjs/common';

import { AiService } from '../ai/ai.service.js';
import { appConfig } from '../config/app.config.js';
import {
  validateDailyObjectives,
  validateMilestones,
  validateWeeklyPlan,
} from './generation-validator.js';
import {
  buildDailyObjectivesSystemPrompt,
  buildDailyObjectivesUserPrompt,
} from './prompts/daily-objective-prompts.js';
import {
  buildMilestoneSystemPrompt,
  buildMilestoneUserPrompt,
} from './prompts/milestone-prompts.js';
import {
  buildWeeklyPlanSystemPrompt,
  buildWeeklyPlanUserPrompt,
} from './prompts/weekly-plan-prompts.js';
import type { AssembledContext } from './types/context.types.js';
import type { GeneratedDailyObjective } from './types/generated-daily-objective.js';
import type { GeneratedMilestone } from './types/generated-milestone.js';
import type { GeneratedWeeklyPlan } from './types/generated-weekly-plan.js';
import type {
  GenerateDailyParams,
  GenerateWeeklyPlanParams,
  MetadataParams,
  RetryParams,
} from './types/generation.types.js';
import type { GenerationMetadata, GoalData } from './types/roadmap.types.js';

const MAX_GENERATION_ATTEMPTS = 2;

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  constructor(private readonly aiService: AiService) {}

  public async generateMilestones(
    context: AssembledContext,
    goal: GoalData,
    language: string,
  ): Promise<{
    milestones: GeneratedMilestone[];
    metadata: GenerationMetadata;
  }> {
    const model = this.resolveModel(appConfig.roadmap.milestoneModel);
    const result = await this.generateWithRetry({
      systemPrompt: buildMilestoneSystemPrompt(language),
      userPrompt: buildMilestoneUserPrompt(context, goal),
      model,
      totalChunks: context.totalChunks,
      label: 'Milestone',
      validate: validateMilestones,
    });
    return {
      milestones: result.milestones as GeneratedMilestone[],
      metadata: result.metadata,
    };
  }

  public async generateWeeklyPlan(
    params: GenerateWeeklyPlanParams,
  ): Promise<{ plan: GeneratedWeeklyPlan; metadata: GenerationMetadata }> {
    const model = this.resolveModel(appConfig.roadmap.weeklyModel);
    const result = await this.generateWithRetry({
      systemPrompt: buildWeeklyPlanSystemPrompt(params.language),
      userPrompt: buildWeeklyPlanUserPrompt({
        context: params.context,
        milestone: params.milestone,
        weekNumber: params.weekNumber,
        generationContext: params.generationContext,
      }),
      model,
      totalChunks: params.context.totalChunks,
      label: 'Weekly plan',
      validate: validateWeeklyPlan,
    });
    return {
      plan: result.milestones as GeneratedWeeklyPlan,
      metadata: result.metadata,
    };
  }

  public async generateDailyObjectives(params: GenerateDailyParams): Promise<{
    objectives: GeneratedDailyObjective[];
    metadata: GenerationMetadata;
  }> {
    const model = this.resolveModel(appConfig.roadmap.dailyModel);
    const result = await this.generateWithRetry({
      systemPrompt: buildDailyObjectivesSystemPrompt(params.language),
      userPrompt: buildDailyObjectivesUserPrompt({
        weeklyPlan: params.weeklyPlan,
        energyLevel: params.energyLevel,
        context: params.context,
        weekData: params.weekData,
      }),
      model,
      totalChunks: params.context.totalChunks,
      label: 'Daily objectives',
      validate: validateDailyObjectives,
    });
    return {
      objectives: result.milestones as GeneratedDailyObjective[],
      metadata: result.metadata,
    };
  }

  private resolveModel(configModel: string): string {
    return configModel === 'default' ? appConfig.ai.defaultModel : configModel;
  }

  private async generateWithRetry(
    params: RetryParams,
  ): Promise<{ milestones: unknown; metadata: GenerationMetadata }> {
    const startTime = Date.now();
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      try {
        const raw = await this.aiService.generateJson<unknown>(
          params.systemPrompt,
          params.userPrompt,
          params.model,
        );
        const validated = params.validate(raw);
        return {
          milestones: validated,
          metadata: this.buildMetadata({
            model: params.model,
            startTime,
            totalChunks: params.totalChunks,
            attempt,
          }),
        };
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `${params.label} generation attempt ${String(attempt + 1)} failed: ${lastError.message}`,
        );
      }
    }
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw lastError;
  }

  private buildMetadata(params: MetadataParams): GenerationMetadata {
    return {
      model_used: params.model,
      latency_ms: Date.now() - params.startTime,
      context_chunks_used: params.totalChunks,
      attempts: params.attempt + 1,
    };
  }
}
