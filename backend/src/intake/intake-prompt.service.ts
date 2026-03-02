import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service.js';
import { appConfig } from '../config/app.config.js';
import { getUniversalBatch1, getFallbackPools } from '../config/questions.config.js';
import type {
  UniversalQuestion,
  GeneratedQuestion,
  PriorBatchContext,
  GoalProfile,
} from '../config/questions.config.js';
import {
  buildIntakeBatchSystemPrompt,
  buildIntakeBatchUserPrompt,
} from '../config/prompts/intake-prompts.config.js';
import {
  buildProfileSystemPrompt,
  buildProfileUserPrompt,
} from '../config/prompts/profile-prompts.config.js';

export interface NextBatchParams {
  goalDescription: string;
  priorBatches: PriorBatchContext[];
  batchNumber: number;
  language: string;
}

export type { UniversalQuestion, GeneratedQuestion, PriorBatchContext, GoalProfile };

@Injectable()
export class IntakePromptService {
  constructor(private readonly aiService: AiService) {}

  public getUniversalBatch(language: string): UniversalQuestion[] {
    return getUniversalBatch1(language).map((q) => ({ ...q }));
  }

  public getFallbackBatch(usedFallbackIndexes: number[], language: string): GeneratedQuestion[] {
    const pools = getFallbackPools(language);
    for (let i = 0; i < pools.length; i++) {
      const pool = pools[i];
      if (pool !== undefined && !usedFallbackIndexes.includes(i)) {
        return pool.map((q) => ({ ...q }));
      }
    }
    const firstPool = pools[0];
    if (firstPool === undefined) {
      return [];
    }
    return firstPool.map((q) => ({ ...q }));
  }

  public findFallbackPoolIndex(firstQuestionText: string): number {
    const pools = getFallbackPools('en');
    return pools.findIndex((pool) => pool[0]?.question_text === firstQuestionText);
  }

  public async generateGoalProfile(
    goalDescription: string,
    priorBatches: PriorBatchContext[],
    language: string,
  ): Promise<GoalProfile> {
    const systemPrompt = buildProfileSystemPrompt(language);
    const userPrompt = buildProfileUserPrompt({
      goalDescription,
      priorBatches,
    });

    return this.aiService.generateJSON<GoalProfile>(
      systemPrompt,
      userPrompt,
      appConfig.intake.model,
      { reasoning: { effort: 'high' } },
    );
  }

  public async generateNextBatch(
    params: NextBatchParams,
  ): Promise<{ questions: GeneratedQuestion[]; is_complete: boolean }> {
    if (params.batchNumber >= appConfig.intake.maxBatches) {
      return { questions: [], is_complete: true };
    }

    const systemPrompt = buildIntakeBatchSystemPrompt({
      batchNumber: params.batchNumber,
      questionsPerBatchMin: appConfig.intake.questionsPerBatch.min,
      questionsPerBatchMax: appConfig.intake.questionsPerBatch.max,
      maxBatches: appConfig.intake.maxBatches,
      language: params.language,
    });
    const userPrompt = buildIntakeBatchUserPrompt({
      goalDescription: params.goalDescription,
      priorBatches: params.priorBatches,
      batchNumber: params.batchNumber,
      maxBatches: appConfig.intake.maxBatches,
    });

    return this.aiService.generateJSON<{
      questions: GeneratedQuestion[];
      is_complete: boolean;
    }>(systemPrompt, userPrompt, appConfig.intake.model);
  }
}
