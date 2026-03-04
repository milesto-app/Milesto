import { Injectable, Logger } from '@nestjs/common';

import { AiService } from '../ai/ai.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { ReembedResult } from './types/intake.types.js';

@Injectable()
export class IntakeReembedService {
  private readonly logger = new Logger(IntakeReembedService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly aiService: AiService,
  ) {}

  public async reembedMissing(): Promise<ReembedResult> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: batches } = await supabase
      .from('intake_batches')
      .select('id, goal_id, batch_number, goals!inner(user_id)')
      .eq('embedded', false);

    const { data: profiles } = await supabase
      .from('goal_profiles')
      .select('id, goal_id, user_id, narrative_summary')
      .eq('embedded', false);

    const batchResults = await this.reembedBatches(batches ?? []);
    const profileResults = await this.reembedProfiles(profiles ?? []);
    const processed = (batches?.length ?? 0) + (profiles?.length ?? 0);
    const succeeded = batchResults.succeeded + profileResults.succeeded;
    const failed = batchResults.failed + profileResults.failed;

    this.logger.log(
      `Re-embed: ${String(processed)} processed, ${String(succeeded)} ok, ${String(failed)} failed`,
    );
    return { processed, succeeded, failed };
  }

  private async reembedBatches(
    batches: Array<Record<string, unknown>>,
  ): Promise<{ succeeded: number; failed: number }> {
    const results = await Promise.all(
      batches.map(async (b) => this.reembedSingleBatch(b)),
    );
    return countResults(results);
  }

  private async reembedSingleBatch(
    batch: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      const batchId = batch.id as string;
      const contentText = await this.buildBatchContent(batchId);
      if (contentText === null) {
        return false;
      }

      const supabase = this.supabaseService.getAdminClient();
      const embedding = await this.aiService.generateEmbedding(contentText);
      const goalsData = batch.goals as { user_id: string } | undefined;
      if (goalsData?.user_id === undefined || goalsData.user_id === '') {
        throw new Error('Missing user_id from goals join');
      }

      const { error } = await supabase.from('context_embeddings').insert({
        goal_id: batch.goal_id as string,
        user_id: goalsData.user_id,
        content_type: 'intake_answer',
        batch_id: batchId,
        content_text: contentText,
        embedding: JSON.stringify(embedding),
      });

      if (error !== null) {
        throw new Error(`Failed to store embedding: ${error.message}`);
      }
      await supabase
        .from('intake_batches')
        .update({ embedded: true })
        .eq('id', batchId);
      return true;
    } catch (error) {
      this.logger.error(
        `Re-embed failed for batch ${String(batch.id)}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  private async buildBatchContent(batchId: string): Promise<string | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: questions, error: qError } = await supabase
      .from('intake_questions')
      .select('id, question_text, question_type, order_in_batch')
      .eq('batch_id', batchId)
      .order('order_in_batch');

    if (qError !== null) {
      this.logger.error(
        `Failed to load questions for batch ${batchId}: ${qError.message}`,
      );
      return null;
    }
    if (questions.length === 0) {
      this.logger.error(
        `Failed to load questions for batch ${batchId}: no questions`,
      );
      return null;
    }

    const questionIds = questions.map((q: { id: string }) => q.id);
    const { data: answers, error: aError } = await supabase
      .from('intake_answers')
      .select('question_id, answer_text, answer_numeric, selected_options')
      .in('question_id', questionIds);

    if (aError !== null) {
      this.logger.error(
        `Failed to load answers for batch ${batchId}: ${aError.message}`,
      );
      return null;
    }

    return formatQAPairs(questions, answers);
  }

  private async reembedProfiles(
    profiles: Array<Record<string, unknown>>,
  ): Promise<{ succeeded: number; failed: number }> {
    const results = await Promise.all(
      profiles.map(async (p) => this.reembedSingleProfile(p)),
    );
    return countResults(results);
  }

  private async reembedSingleProfile(
    profile: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      const supabase = this.supabaseService.getAdminClient();
      if (
        typeof profile.narrative_summary !== 'string' ||
        profile.narrative_summary === ''
      ) {
        throw new Error('Missing narrative_summary');
      }
      const embedding = await this.aiService.generateEmbedding(
        profile.narrative_summary,
      );
      const { error } = await supabase.from('context_embeddings').insert({
        goal_id: profile.goal_id as string,
        user_id: profile.user_id as string,
        content_type: 'goal_profile',
        profile_id: profile.id as string,
        content_text: profile.narrative_summary,
        embedding: JSON.stringify(embedding),
      });
      if (error !== null) {
        throw new Error(`Failed to store embedding: ${error.message}`);
      }
      await supabase
        .from('goal_profiles')
        .update({ embedded: true })
        .eq('id', profile.id as string);
      return true;
    } catch (error) {
      this.logger.error(
        `Re-embed failed for profile ${String(profile.id)}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}

function formatQAPairs(
  questions: Array<{ id: string; question_text: string }>,
  answers: Array<Record<string, unknown>>,
): string {
  const answerMap = new Map(answers.map((a) => [a.question_id as string, a]));
  return questions
    .map((q) => {
      const answer = answerMap.get(q.id);
      const text = formatSingleAnswer(answer);
      return `Q: ${q.question_text}\nA: ${text}`;
    })
    .join('\n\n');
}

function formatSingleAnswer(
  answer: Record<string, unknown> | undefined,
): string {
  if (answer === undefined) {
    return '(no answer)';
  }
  return extractAnswerText(answer);
}

function extractAnswerText(answer: Record<string, unknown>): string {
  if (typeof answer.answer_text === 'string') {
    return answer.answer_text;
  }
  if (typeof answer.answer_numeric === 'number') {
    return String(answer.answer_numeric);
  }
  if (Array.isArray(answer.selected_options)) {
    return (answer.selected_options as string[]).join(', ');
  }
  return '(no answer)';
}

function countResults(results: boolean[]): {
  succeeded: number;
  failed: number;
} {
  const succeeded = results.filter(Boolean).length;
  return { succeeded, failed: results.length - succeeded };
}
