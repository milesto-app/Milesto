import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { UserLanguageService } from "../common/user-language.service.js";
import { GoalService } from "../goal/goal.service.js";
import { FIRST_BATCH_NUMBER } from "./constants/intake.constants.js";
import { validateAnswerSet } from "./intake-answer-validator.js";
import { IntakeContextService } from "./intake-context.service.js";
import { IntakeGenerationService } from "./intake-generation.service.js";
import { IntakePromptService } from "./intake-prompt.service.js";
import type { StoreBatchOptions, StoredBatch } from "./intake-store.service.js";
import { IntakeStoreService } from "./intake-store.service.js";
import { IntakeTargetDateService } from "./intake-target-date.service.js";
import type {
  AnswerInput,
  BatchParams,
  BatchServedEvent,
} from "./types/intake.types.js";

@Injectable()
export class IntakeBatchService {
  private readonly logger = new Logger(IntakeBatchService.name);
  private readonly goalGenerationLocks = new Map<string, Promise<unknown>>();

  constructor(
    private readonly goalService: GoalService,
    private readonly storeService: IntakeStoreService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
  ) {}

  @Inject()
  private readonly languageService!: UserLanguageService;

  @Inject()
  private readonly targetDateService!: IntakeTargetDateService;

  @Inject()
  private readonly generationService!: IntakeGenerationService;

  @Inject()
  private readonly contextService!: IntakeContextService;

  @Inject()
  private readonly promptService!: IntakePromptService;

  public async getNextBatch(userId: string, goalId: string): Promise<unknown> {
    const goal = await this.goalService.findOne(userId, goalId);
    if (goal.status !== "intake_in_progress") {
      throw new BadRequestException("Intake is not active for this goal");
    }
    const language = await this.languageService.getLanguage(userId);
    const latestBatch = await this.storeService.queryLatestBatch(goalId);
    if (latestBatch === null) {
      const questions = this.promptService.getUniversalBatch(language);
      const result = await this.storeService.storeGeneratedBatch({
        goalId,
        batchNumber: FIRST_BATCH_NUMBER,
        questions,
      });
      this.emitBatchEvent("batch.served", {
        goal_id: goalId,
        batch_id: result.batch_id,
        batch_number: result.batch_number,
        user_id: userId,
      });
      return result;
    }
    if (!(latestBatch.is_answered as boolean)) {
      return this.storeService.reServeBatch(
        latestBatch as { id: string; batch_number: number },
      );
    }
    return this.generateWithLock({
      userId,
      goalId,
      goalDescription: goal.description,
      nextBatchNumber: (latestBatch.batch_number as number) + 1,
      language,
    });
  }

  public async submitBatch(
    userId: string,
    goalId: string,
    answers: AnswerInput[],
  ): Promise<unknown> {
    const goal = await this.goalService.findOne(userId, goalId);
    if (goal.status !== "intake_in_progress") {
      throw new BadRequestException("Intake is not active for this goal");
    }
    const language = await this.languageService.getLanguage(userId);
    const batch = await this.storeService.queryUnansweredBatch(goalId);
    const questions = await this.storeService.loadBatchQuestions(batch.id);
    validateAnswerSet(answers, questions);
    await this.storeService.persistAnswers(answers, batch.id);
    await this.targetDateService.tryExtractTargetDate(
      goalId,
      questions,
      answers,
    );
    this.emitBatchEvent("batch.answered", {
      goal_id: goalId,
      batch_id: batch.id,
      batch_number: batch.batch_number,
      user_id: userId,
    });
    return this.tryGenerateNext(batch, {
      userId,
      goalId,
      goalDescription: goal.description,
      nextBatchNumber: batch.batch_number + 1,
      language,
    });
  }

  private async generateWithLock(params: BatchParams): Promise<unknown> {
    const existing = this.goalGenerationLocks.get(params.goalId);
    if (existing !== undefined) {
      await existing;
      const latestBatch = await this.storeService.queryLatestBatch(
        params.goalId,
      );
      if (latestBatch === null) {
        throw new BadRequestException(
          "No batch found after concurrent generation",
        );
      }
      return this.storeService.reServeBatch(
        latestBatch as { id: string; batch_number: number },
      );
    }
    const promise = this.doGenerate(params);
    this.goalGenerationLocks.set(params.goalId, promise);
    try {
      return await promise;
    } finally {
      this.goalGenerationLocks.delete(params.goalId);
    }
  }

  private async doGenerate(params: BatchParams): Promise<unknown> {
    const priorBatches = await this.contextService.loadPriorBatchContext(
      params.goalId,
    );
    const result = await this.generationService.generateBatch({
      ...params,
      priorBatches,
    });
    if (result.kind === "complete") {
      return {
        batch_id: null,
        batch_number: null,
        is_complete: true,
        questions: [],
        ...result.profileResult,
      };
    }
    return this.storeBatchAndEmit(params, result.questions);
  }

  private async storeBatchAndEmit(
    params: BatchParams,
    questions: StoreBatchOptions["questions"],
  ): Promise<StoredBatch> {
    const stored = await this.storeService.storeGeneratedBatch({
      goalId: params.goalId,
      batchNumber: params.nextBatchNumber,
      questions,
    });
    this.emitBatchEvent("batch.served", {
      goal_id: params.goalId,
      batch_id: stored.batch_id,
      batch_number: stored.batch_number,
      user_id: params.userId,
    });
    return stored;
  }

  private async tryGenerateNext(
    submittedBatch: { id: string; batch_number: number },
    params: BatchParams,
  ): Promise<unknown> {
    const batchRef = {
      batch_id: submittedBatch.id,
      batch_number: submittedBatch.batch_number,
    };
    try {
      const nextResult = await this.generateWithLock(params);
      const typed = nextResult as Record<string, unknown>;
      if (typed.is_complete === true) {
        return { submitted_batch: batchRef, ...typed };
      }
      return { submitted_batch: batchRef, next_batch: nextResult };
    } catch (error) {
      this.logger.error(
        `Generation after submit failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        submitted_batch: batchRef,
        message: "Answers submitted successfully",
      };
    }
  }

  private emitBatchEvent(event: string, payload: BatchServedEvent): void {
    this.eventEmitter.emit(event, payload);
  }
}
