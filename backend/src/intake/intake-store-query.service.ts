import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { SUPABASE_NOT_FOUND } from '../supabase/error-codes.js';
import type { StoredBatch, QuestionConfig } from './intake-store.service.js';

@Injectable()
export class IntakeStoreQueryService {
  private readonly logger = new Logger(IntakeStoreQueryService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async queryLatestBatch(
    goalId: string,
  ): Promise<Record<string, unknown> | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('intake_batches')
      .select('*')
      .eq('goal_id', goalId)
      .order('batch_number', { ascending: false })
      .limit(1)
      .single();

    if (error !== null && error.code !== SUPABASE_NOT_FOUND) {
      this.logger.error(
        `Failed to query batches for goal ${goalId}: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to query batches');
    }
    return data;
  }

  public async loadBatchQuestions(
    batchId: string,
  ): Promise<
    Array<{ id: string; question_type: string; config: QuestionConfig | null }>
  > {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('intake_questions')
      .select('*')
      .eq('batch_id', batchId);

    if (error !== null) {
      this.logger.error(
        `Failed to query questions for batch ${batchId}: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to query questions');
    }
    return data as Array<{
      id: string;
      question_type: string;
      config: QuestionConfig | null;
    }>;
  }

  public async reServeBatch(batch: {
    id: string;
    batch_number: number;
  }): Promise<StoredBatch> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('intake_questions')
      .select('id, question_text, question_type, config, order_in_batch')
      .eq('batch_id', batch.id)
      .order('order_in_batch');

    if (error !== null) {
      this.logger.error(
        `Failed to query questions for batch ${batch.id}: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to query questions');
    }
    return {
      batch_id: batch.id,
      batch_number: batch.batch_number,
      is_complete: false,
      questions: data,
    };
  }

  public async getUsedFallbackIndexes(
    goalId: string,
    findPoolIndex: (text: string) => number,
  ): Promise<number[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: fallbackBatches, error } = await supabase
      .from('intake_batches')
      .select('id')
      .eq('goal_id', goalId)
      .eq('is_fallback', true)
      .order('batch_number');

    if (error !== null) {
      return [];
    }
    if (fallbackBatches.length === 0) {
      return [];
    }
    const batchIds = fallbackBatches.map((b) => b.id);
    return this.resolvePoolIndexes(batchIds, findPoolIndex);
  }

  private async resolvePoolIndexes(
    batchIds: string[],
    findPoolIndex: (text: string) => number,
  ): Promise<number[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: allQuestions } = await supabase
      .from('intake_questions')
      .select('batch_id, question_text, order_in_batch')
      .in('batch_id', batchIds)
      .order('order_in_batch');

    if (allQuestions === null) {
      return [];
    }
    const indexes: number[] = [];
    for (const batchId of batchIds) {
      const first = allQuestions.find(
        (q) => q.batch_id === batchId && q.order_in_batch === 1,
      );
      if (first !== undefined) {
        const poolIndex = findPoolIndex(first.question_text);
        if (poolIndex >= 0) {
          indexes.push(poolIndex);
        }
      }
    }
    return indexes;
  }
}
