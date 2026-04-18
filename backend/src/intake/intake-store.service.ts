import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import type { Database, Json } from '../supabase/database.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { GeneratedQuestion } from './intake-prompt.service.js';
import { IntakeStoreQueryService } from './intake-store-query.service.js';
import type { AnswerInput } from './types/intake.types.js';

type IntakeQuestionUpdate =
  Database['public']['Tables']['intake_questions']['Update'];

export interface StoreBatchOptions {
  goalId: string;
  batchNumber: number;
  questions: GeneratedQuestion[];
}

export interface StoredBatch {
  batch_id: string;
  batch_number: number;
  is_complete: boolean;
  questions: unknown[];
}

export interface QuestionConfig {
  min?: number;
  max?: number;
  options?: string[];
  format?: string;
}

@Injectable()
export class IntakeStoreService {
  private readonly logger = new Logger(IntakeStoreService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly queryService: IntakeStoreQueryService,
  ) {}

  public async queryLatestBatch(
    goalId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.queryService.queryLatestBatch(goalId);
  }

  public async queryUnansweredBatch(
    goalId: string,
  ): Promise<{ id: string; batch_number: number }> {
    const latestBatch = await this.queryService.queryLatestBatch(goalId);
    if (latestBatch === null || (latestBatch.is_answered as boolean)) {
      throw new ConflictException('No unanswered batch available');
    }
    return {
      id: latestBatch.id as string,
      batch_number: latestBatch.batch_number as number,
    };
  }

  public async loadBatchQuestions(
    batchId: string,
  ): Promise<
    Array<{ id: string; question_type: string; config: QuestionConfig | null }>
  > {
    return this.queryService.loadBatchQuestions(batchId);
  }

  public async reServeBatch(batch: {
    id: string;
    batch_number: number;
  }): Promise<StoredBatch> {
    return this.queryService.reServeBatch(batch);
  }

  public async storeGeneratedBatch(
    options: StoreBatchOptions,
  ): Promise<StoredBatch> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: batch, error } = await supabase
      .from('intake_batches')
      .insert({
        goal_id: options.goalId,
        batch_number: options.batchNumber,
        is_fallback: false,
      })
      .select()
      .single();

    if (error !== null) {
      throw new Error(`Failed to create batch: ${error.message}`);
    }

    const inserted = await this.insertQuestions({
      goalId: options.goalId,
      batchId: batch.id,
      batchNumber: options.batchNumber,
      questions: options.questions,
    });
    return {
      batch_id: batch.id,
      batch_number: options.batchNumber,
      is_complete: false,
      questions: inserted,
    };
  }

  public async persistAnswers(
    answers: AnswerInput[],
    batchId: string,
  ): Promise<void> {
    const answeredAt = new Date().toISOString();
    await Promise.all(
      answers.map(async (answer) => this.updateAnswer(answer, answeredAt)),
    );
    await this.markBatchAnswered(batchId);
  }

  private async updateAnswer(
    answer: AnswerInput,
    answeredAt: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const update: IntakeQuestionUpdate = {
      answer_text: answer.answer_text ?? null,
      answer_numeric: answer.answer_numeric ?? null,
      selected_options: (answer.selected_options ?? null) as Json | null,
      answered_at: answeredAt,
    };
    const { error } = await supabase
      .from('intake_questions')
      .update(update)
      .eq('id', answer.question_id);
    if (error !== null) {
      this.logger.error(
        `Failed to update answer for question ${answer.question_id}: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to save answers');
    }
  }

  private async insertQuestions(params: {
    goalId: string;
    batchId: string;
    batchNumber: number;
    questions: GeneratedQuestion[];
  }): Promise<unknown[]> {
    const supabase = this.supabaseService.getAdminClient();
    const rows = params.questions.map((q, i) => ({
      goal_id: params.goalId,
      batch_id: params.batchId,
      batch_number: params.batchNumber,
      question_text: q.question_text,
      question_type: q.question_type,
      config: q.config as Json,
      order_in_batch: i + 1,
    }));

    const { data, error } = await supabase
      .from('intake_questions')
      .insert(rows)
      .select('id, question_text, question_type, config, order_in_batch');

    if (error !== null) {
      throw new Error(`Failed to create questions: ${error.message}`);
    }
    return data;
  }

  private async markBatchAnswered(batchId: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from('intake_batches')
      .update({ is_answered: true })
      .eq('id', batchId);

    if (error !== null) {
      this.logger.error(`Failed to mark batch as answered: ${error.message}`);
      throw new InternalServerErrorException('Failed to update batch status');
    }
  }
}
