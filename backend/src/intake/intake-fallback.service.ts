import { Injectable, Logger } from '@nestjs/common';
import { appConfig } from '../config/app.config.js';
import { IntakePromptService } from './intake-prompt.service.js';
import { IntakeStoreService } from './intake-store.service.js';
import { FIRST_BATCH_NUMBER } from './constants/intake.constants.js';
import type { StoredBatch } from './intake-store.service.js';

@Injectable()
export class IntakeFallbackService {
  private readonly logger = new Logger(IntakeFallbackService.name);

  constructor(
    private readonly promptService: IntakePromptService,
    private readonly storeService: IntakeStoreService,
  ) {}

  public async serveFirstBatch(goalId: string): Promise<StoredBatch> {
    const questions = this.promptService.getUniversalBatch();
    return this.storeService.storeGeneratedBatch({
      goalId,
      batchNumber: FIRST_BATCH_NUMBER,
      questions,
    });
  }

  public async serveFallback(params: {
    goalId: string;
    nextBatchNumber: number;
  }): Promise<StoredBatch> {
    if (params.nextBatchNumber >= appConfig.intake.maxBatches) {
      return {
        batch_id: '',
        batch_number: params.nextBatchNumber,
        is_complete: true,
        questions: [],
      };
    }
    const usedIndexes = await this.storeService.getUsedFallbackIndexes(params.goalId, (text) =>
      this.promptService.findFallbackPoolIndex(text),
    );
    const questions = this.promptService.getFallbackBatch(usedIndexes);
    this.logger.warn(
      `Serving fallback batch ${String(params.nextBatchNumber)} for goal ${params.goalId}`,
    );
    return this.storeService.storeGeneratedBatch({
      goalId: params.goalId,
      batchNumber: params.nextBatchNumber,
      questions,
      isFallback: true,
    });
  }
}
