import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service.js';
import { appConfig } from '../config/app.config.js';
import { UNIVERSAL_BATCH_1, FALLBACK_POOLS } from '../config/questions.config.js';
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
  PROFILE_SYSTEM_PROMPT,
  buildProfileUserPrompt,
} from '../config/prompts/profile-prompts.config.js';

export type { UniversalQuestion, GeneratedQuestion, PriorBatchContext, GoalProfile };

@Injectable()
export class IntakePromptService {
  constructor(private readonly aiService: AiService) {}

  public getUniversalBatch(): UniversalQuestion[] {
    return UNIVERSAL_BATCH_1.map((q) => ({ ...q }));
  }

  public getFallbackBatch(usedFallbackIndexes: number[]): GeneratedQuestion[] {
    for (let i = 0; i < FALLBACK_POOLS.length; i++) {
      const pool = FALLBACK_POOLS[i];
      if (pool !== undefined && !usedFallbackIndexes.includes(i)) {
        return pool.map((q) => ({ ...q }));
      }
    }
    const firstPool = FALLBACK_POOLS[0];
    if (firstPool === undefined) {
      return [];
    }
    return firstPool.map((q) => ({ ...q }));
  }

  public findFallbackPoolIndex(firstQuestionText: string): number {
    return FALLBACK_POOLS.findIndex((pool) => pool[0]?.question_text === firstQuestionText);
  }

  public async generateGoalProfile(
    goalDescription: string,
    priorBatches: PriorBatchContext[],
  ): Promise<GoalProfile> {
    const systemPrompt = PROFILE_SYSTEM_PROMPT;
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
    goalDescription: string,
    priorBatches: PriorBatchContext[],
    batchNumber: number,
  ): Promise<{ questions: GeneratedQuestion[]; is_complete: boolean }> {
    if (batchNumber >= appConfig.intake.maxBatches) {
      return { questions: [], is_complete: true };
    }

    const systemPrompt = buildIntakeBatchSystemPrompt({
      batchNumber,
      questionsPerBatchMin: appConfig.intake.questionsPerBatch.min,
      questionsPerBatchMax: appConfig.intake.questionsPerBatch.max,
      maxBatches: appConfig.intake.maxBatches,
    });
    const userPrompt = buildIntakeBatchUserPrompt({
      goalDescription,
      priorBatches,
      batchNumber,
      maxBatches: appConfig.intake.maxBatches,
    });

    return this.aiService.generateJSON<{
      questions: GeneratedQuestion[];
      is_complete: boolean;
    }>(systemPrompt, userPrompt, appConfig.intake.model);
  }
}
