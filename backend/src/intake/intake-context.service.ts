import { Injectable, Logger } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service.js';
import type { PriorBatchContext } from './intake-prompt.service.js';

@Injectable()
export class IntakeContextService {
  private readonly logger = new Logger(IntakeContextService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async loadPriorBatchContext(
    goalId: string,
  ): Promise<PriorBatchContext[]> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: priorData, error } = await supabase
      .from('intake_batches')
      .select(
        `id, batch_number,
        intake_questions (
          id, question_text, question_type, config, order_in_batch,
          intake_answers ( answer_text, answer_numeric, selected_options )
        )`,
      )
      .eq('goal_id', goalId)
      .eq('is_answered', true)
      .order('batch_number');

    if (error !== null) {
      this.logger.error(`Failed to load prior batch context: ${error.message}`);
      return [];
    }

    return priorData.map((batch: Record<string, unknown>) =>
      this.mapBatchToPriorContext(batch),
    );
  }

  private mapBatchToPriorContext(
    batch: Record<string, unknown>,
  ): PriorBatchContext {
    const questions = batch.intake_questions as
      | Record<string, unknown>[]
      | null;
    return {
      batch_number: batch.batch_number as number,
      questions: (questions ?? []).map((q) => {
        const answers = q.intake_answers as Record<string, unknown>[] | null;
        const answer = (answers ?? [])[0];
        return {
          question_text: q.question_text as string,
          question_type: q.question_type as string,
          answer: formatAnswer(q, answer),
          config: (q.config as Record<string, unknown> | null) ?? null,
        };
      }),
    };
  }
}

function formatNumericAnswer(value: unknown): string {
  return typeof value === 'number' ? String(value) : '[no answer]';
}

function formatAnswer(
  question: Record<string, unknown>,
  answer: Record<string, unknown> | undefined,
): string {
  if (answer === undefined) {
    return '[no answer]';
  }

  switch (question.question_type) {
    case 'text': {
      const text = answer.answer_text as string | undefined;
      return text !== undefined && text !== '' ? text : '[no answer]';
    }
    case 'scale':
      return formatNumericAnswer(answer.answer_numeric);
    case 'single_choice':
    case 'multiple_choice': {
      const options = answer.selected_options as string[] | undefined;
      return options !== undefined ? options.join(', ') : '';
    }
    default:
      return '[unknown type]';
  }
}
