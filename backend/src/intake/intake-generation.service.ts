import { Injectable, Logger } from '@nestjs/common';
import { IntakePromptService } from './intake-prompt.service.js';
import { IntakeQualityService } from './intake-quality.service.js';
import { IntakeProfileService } from './intake-profile.service.js';
import { MAX_GENERATION_ATTEMPTS } from './constants/intake.constants.js';
import type {
  GeneratedQuestion,
  PriorBatchContext,
} from './intake-prompt.service.js';
import type { ProfileResult } from './types/intake.types.js';

export type BatchGenerationResult =
  | { kind: 'questions'; questions: GeneratedQuestion[] }
  | { kind: 'complete'; profileResult: ProfileResult }
  | { kind: 'fallback' };

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
    private readonly promptService: IntakePromptService,
    private readonly qualityService: IntakeQualityService,
    private readonly profileService: IntakeProfileService,
  ) {}

  public async generateBatch(
    params: GenerateParams,
  ): Promise<BatchGenerationResult> {
    return this.attemptGeneration(params);
  }

  private async attemptGeneration(
    params: GenerateParams,
  ): Promise<BatchGenerationResult> {
    const results = await this.runAllAttempts(params);
    return results ?? { kind: 'fallback' };
  }

  private async runAllAttempts(
    params: GenerateParams,
  ): Promise<BatchGenerationResult | null> {
    return this.runAttempt(params, 1);
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
    const generated = await this.promptService.generateNextBatch({
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
      return { kind: 'complete', profileResult };
    }

    const validation = this.qualityService.validateBatch(generated.questions);
    if (validation.valid) {
      return { kind: 'questions', questions: generated.questions };
    }

    this.logValidationFailure(attempt, validation);
    return null;
  }

  private logValidationFailure(
    attempt: number,
    validation: { layer: string; errors: string[] },
  ): void {
    const suffix =
      attempt === MAX_GENERATION_ATTEMPTS
        ? ' Serving fallback.'
        : ' Retrying...';
    this.logger.warn(
      `Batch attempt ${String(attempt)}/${String(MAX_GENERATION_ATTEMPTS)} validation failed (${validation.layer}): ${validation.errors.join(', ')}.${suffix}`,
    );
  }

  private logAttemptError(attempt: number, error: unknown): void {
    const suffix =
      attempt === MAX_GENERATION_ATTEMPTS
        ? ' Serving fallback.'
        : ' Retrying...';
    this.logger.warn(
      `Batch attempt ${String(attempt)}/${String(MAX_GENERATION_ATTEMPTS)} failed: ${error instanceof Error ? error.message : String(error)}.${suffix}`,
    );
  }
}
