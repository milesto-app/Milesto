import { Injectable } from "@nestjs/common";

import { AiService } from "../ai/ai.service.js";
import { config } from "../config/app.config.js";
import {
  buildIntakeBatchSystemPrompt,
  buildIntakeBatchUserPrompt,
} from "../config/prompts/intake-prompts.config.js";
import {
  buildProfileSystemPrompt,
  buildProfileUserPrompt,
} from "../config/prompts/profile-prompts.config.js";
import type {
  GeneratedQuestion,
  GoalProfile,
  PriorBatchContext,
  UniversalQuestion,
} from "../config/questions.config.js";
import { getUniversalBatch1 } from "../config/questions.config.js";

export interface NextBatchParams {
  goalDescription: string;
  priorBatches: PriorBatchContext[];
  batchNumber: number;
  language: string;
}

export type {
  GeneratedQuestion,
  GoalProfile,
  PriorBatchContext,
  UniversalQuestion,
};

@Injectable()
export class IntakePromptService {
  constructor(private readonly aiService: AiService) {}

  public getUniversalBatch(language: string): UniversalQuestion[] {
    return getUniversalBatch1(language).map((q) => ({ ...q }));
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

    return this.aiService.generateJson<GoalProfile>(
      systemPrompt,
      userPrompt,
      config.intake.model,
      "high",
    );
  }

  public async generateNextBatch(
    params: NextBatchParams,
  ): Promise<{ questions: GeneratedQuestion[]; is_complete: boolean }> {
    if (params.batchNumber >= config.intake.maxBatches) {
      return { questions: [], is_complete: true };
    }

    const systemPrompt = buildIntakeBatchSystemPrompt({
      batchNumber: params.batchNumber,
      questionsPerBatchMin: config.intake.questionsPerBatch.min,
      questionsPerBatchMax: config.intake.questionsPerBatch.max,
      maxBatches: config.intake.maxBatches,
      language: params.language,
    });
    const userPrompt = buildIntakeBatchUserPrompt({
      goalDescription: params.goalDescription,
      priorBatches: params.priorBatches,
      batchNumber: params.batchNumber,
      maxBatches: config.intake.maxBatches,
    });

    return this.aiService.generateJson<{
      questions: GeneratedQuestion[];
      is_complete: boolean;
    }>(systemPrompt, userPrompt, config.intake.model);
  }
}
