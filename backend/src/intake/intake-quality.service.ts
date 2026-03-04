import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AiService } from '../ai/ai.service.js';
import { appConfig } from '../config/app.config.js';
import { QUALITY_JUDGE_SYSTEM_PROMPT } from '../config/prompts/quality-prompts.config.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import {
  validateGoalProfile,
  validateSemantic,
  validateStructural,
} from './intake-batch-validator.js';
import type { QualityScores } from './intake-quality-scoring.js';
import {
  buildQualityUserPrompt,
  computeComposite,
} from './intake-quality-scoring.js';
import type { BatchServedEvent } from './types/intake.types.js';

const SCORE_DECIMAL_PLACES = 2;

@Injectable()
export class IntakeQualityService {
  private readonly logger = new Logger(IntakeQualityService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly supabaseService: SupabaseService,
  ) {}

  public validateGoalProfile(profile: unknown): {
    valid: boolean;
    errors: string[];
  } {
    return validateGoalProfile(profile);
  }

  public validateBatch(questions: unknown[]): {
    valid: boolean;
    errors: string[];
    layer: 'structural' | 'semantic';
  } {
    const structural = validateStructural(questions);
    if (!structural.valid) {
      return { valid: false, errors: structural.errors, layer: 'structural' };
    }
    const semantic = validateSemantic(
      questions as Array<{
        question_text: string;
        question_type: string;
        config: Record<string, unknown> | null;
      }>,
    );
    if (!semantic.valid) {
      return { valid: false, errors: semantic.errors, layer: 'semantic' };
    }
    return { valid: true, errors: [], layer: 'semantic' };
  }

  @OnEvent('batch.served')
  public async handleBatchServed(payload: BatchServedEvent): Promise<void> {
    try {
      await this.scoreBatch(payload);
    } catch (error) {
      this.logger.error(
        `Quality scoring failed for batch ${payload.batch_id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async scoreBatch(payload: BatchServedEvent): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: questions, error: qError } = await supabase
      .from('intake_questions')
      .select('question_text, question_type')
      .eq('batch_id', payload.batch_id)
      .order('order_in_batch');

    if (qError !== null) {
      this.logger.error(
        `Failed to load questions for quality scoring (batch ${payload.batch_id}): ${qError.message}`,
      );
      return;
    }
    if (questions.length === 0) {
      this.logger.error(
        `Failed to load questions for quality scoring (batch ${payload.batch_id}): none`,
      );
      return;
    }

    const goalDescription = await this.loadGoalDescription(payload.goal_id);
    if (goalDescription === null) {
      return;
    }

    const priorQuestions = await this.loadPriorQuestions(payload);
    const scores = await this.evaluateQuality({
      questions,
      goalDescription,
      batchNumber: payload.batch_number,
      priorQuestions,
    });
    await this.storeScore(payload.batch_id, scores.composite);
    this.logScore(scores, payload);
  }

  private async loadGoalDescription(goalId: string): Promise<string | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: goal, error } = await supabase
      .from('goals')
      .select('description')
      .eq('id', goalId)
      .single();
    if (error !== null) {
      this.logger.error(
        `Failed to load goal for quality scoring (goal ${goalId}): ${error.message}`,
      );
      return null;
    }
    return goal.description;
  }

  private async loadPriorQuestions(
    payload: BatchServedEvent,
  ): Promise<Array<{ question_text: string; batch_number: number }>> {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from('intake_questions')
      .select('question_text, batch_number')
      .eq('goal_id', payload.goal_id)
      .lt('batch_number', payload.batch_number)
      .order('batch_number')
      .order('order_in_batch');
    return data ?? [];
  }

  private async evaluateQuality(params: {
    questions: Array<{ question_text: string; question_type: string }>;
    goalDescription: string;
    batchNumber: number;
    priorQuestions: Array<{ question_text: string; batch_number: number }>;
  }): Promise<QualityScores & { composite: number }> {
    const userPrompt = buildQualityUserPrompt(params);
    const scores = await this.aiService.generateJSON<QualityScores>(
      QUALITY_JUDGE_SYSTEM_PROMPT,
      userPrompt,
    );
    return computeComposite(scores);
  }

  private async storeScore(batchId: string, composite: number): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from('intake_batches')
      .update({ quality_score: composite })
      .eq('id', batchId);
    if (error !== null) {
      this.logger.error(
        `Failed to store quality score for batch ${batchId}: ${error.message}`,
      );
    }
  }

  private logScore(
    scores: QualityScores & { composite: number },
    payload: BatchServedEvent,
  ): void {
    const scoreStr = scores.composite.toFixed(SCORE_DECIMAL_PLACES);
    if (scores.composite < appConfig.intake.qualityWarnThreshold) {
      this.logger.warn(
        `Low quality score for batch ${String(payload.batch_number)} (goal ${payload.goal_id}): composite=${scoreStr}`,
      );
    } else {
      this.logger.log(
        `Quality score for batch ${String(payload.batch_number)} (goal ${payload.goal_id}): composite=${scoreStr}`,
      );
    }
  }
}
