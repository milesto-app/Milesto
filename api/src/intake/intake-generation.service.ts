import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";

import { AiService } from "../ai/ai.service.js";
import { config } from "../config/app.config.js";
import type {
  GeneratedQuestion,
  PriorBatchContext,
} from "../config/questions.config.js";
import { UsageService } from "../usage/usage.service.js";
import { GenerationType } from "../usage/usage.types.js";
import { MAX_GENERATION_ATTEMPTS } from "./constants/intake.constants.js";
import { IntakeProfileService } from "./intake-profile.service.js";
import { validateBatch } from "./intake-validators.js";
import {
  buildIntakeBatchSystemPrompt,
  buildIntakeBatchUserPrompt,
} from "./prompts/intake-batch-prompts.js";
import type { ProfileResult } from "./types/intake.types.js";

export type BatchGenerationResult =
  | { kind: "questions"; questions: GeneratedQuestion[] }
  | { kind: "complete"; profileResult: ProfileResult };

interface GenerateParams {
  goalDescription: string;
  priorBatches: PriorBatchContext[];
  nextBatchNumber: number;
  userId: string;
  goalId: string;
  language: string;
}

@Injectable()
export class IntakeGenerationService {
  private readonly logger = new Logger(IntakeGenerationService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly profileService: IntakeProfileService,
    private readonly usageService: UsageService,
  ) {}

  public async generateBatch(
    params: GenerateParams,
  ): Promise<BatchGenerationResult> {
    await this.usageService.reserveGeneration(
      params.userId,
      GenerationType.INTAKE_BATCH,
    );
    return this.attemptGeneration(params);
  }

  private async attemptGeneration(
    params: GenerateParams,
  ): Promise<BatchGenerationResult> {
    const result = await this.runAttempt(params, 1);
    if (result === null) {
      this.logger.error(
        `All ${String(MAX_GENERATION_ATTEMPTS)} generation attempts failed for goal ${params.goalId}`,
      );
      throw new InternalServerErrorException(
        "Question generation failed after all retry attempts",
      );
    }
    return result;
  }

  private async runAttempt(
    params: GenerateParams,
    attempt: number,
  ): Promise<BatchGenerationResult | null> {
    const result = await this.singleAttempt(params, attempt);
    if (result !== null || attempt >= MAX_GENERATION_ATTEMPTS) {
      return result;
    }
    return this.runAttempt(params, attempt + 1);
  }

  private async singleAttempt(
    params: GenerateParams,
    attempt: number,
  ): Promise<BatchGenerationResult | null> {
    try {
      return await this.tryGenerate(params, attempt);
    } catch (error) {
      this.logAttemptError(attempt, error);
    }
    return null;
  }

  private async tryGenerate(
    params: GenerateParams,
    attempt: number,
  ): Promise<BatchGenerationResult | null> {
    const generated = await this.generateNextBatch({
      userId: params.userId,
      goalDescription: params.goalDescription,
      priorBatches: params.priorBatches,
      batchNumber: params.nextBatchNumber,
      language: params.language,
    });

    if (generated.is_complete) {
      const profileResult = await this.profileService.generateAndStoreProfile({
        userId: params.userId,
        goalId: params.goalId,
        goalDescription: params.goalDescription,
        language: params.language,
      });
      return { kind: "complete", profileResult };
    }

    const validation = validateBatch(generated.questions);
    if (validation.valid) {
      return { kind: "questions", questions: generated.questions };
    }

    this.logValidationFailure(attempt, validation);
    return null;
  }

  private async generateNextBatch(params: {
    userId: string;
    goalDescription: string;
    priorBatches: PriorBatchContext[];
    batchNumber: number;
    language: string;
  }): Promise<{ questions: GeneratedQuestion[]; is_complete: boolean }> {
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

    const { data, usage } = await this.aiService.generateJson<{
      questions: GeneratedQuestion[];
      is_complete: boolean;
    }>(systemPrompt, userPrompt, config.intake.model);
    await this.usageService.record(params.userId, GenerationType.INTAKE_BATCH, {
      promptTokens: usage?.promptTokens,
      completionTokens: usage?.completionTokens,
      model: usage?.model,
    });
    return data;
  }

  private logValidationFailure(
    attempt: number,
    validation: { layer: string; errors: string[] },
  ): void {
    const suffix =
      attempt === MAX_GENERATION_ATTEMPTS
        ? " No attempts remaining."
        : " Retrying...";
    this.logger.warn(
      `Batch attempt ${String(attempt)}/${String(MAX_GENERATION_ATTEMPTS)} validation failed (${validation.layer}): ${validation.errors.join(", ")}.${suffix}`,
    );
  }

  private logAttemptError(attempt: number, error: unknown): void {
    const suffix =
      attempt === MAX_GENERATION_ATTEMPTS
        ? " No attempts remaining."
        : " Retrying...";
    this.logger.warn(
      `Batch attempt ${String(attempt)}/${String(MAX_GENERATION_ATTEMPTS)} failed: ${error instanceof Error ? error.message : String(error)}.${suffix}`,
    );
  }
}
