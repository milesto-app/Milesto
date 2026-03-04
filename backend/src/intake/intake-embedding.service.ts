import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AiService } from '../ai/ai.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type {
  BatchAnsweredEvent,
  ProfileGeneratedEvent,
} from './types/intake.types.js';

@Injectable()
export class IntakeEmbeddingService {
  private readonly logger = new Logger(IntakeEmbeddingService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly aiService: AiService,
  ) {}

  @OnEvent('batch.answered')
  public async handleBatchAnswered(payload: BatchAnsweredEvent): Promise<void> {
    try {
      const contentText = await this.buildBatchContent(payload.batch_id);
      if (contentText === null) {
        return;
      }
      await this.storeBatchEmbedding(payload, contentText);
    } catch (error) {
      this.logger.error(
        `Embedding failed for batch ${payload.batch_id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @OnEvent('profile.generated')
  public async handleProfileGenerated(
    payload: ProfileGeneratedEvent,
  ): Promise<void> {
    try {
      const narrative = await this.loadProfileNarrative(payload.profile_id);
      if (narrative === null) {
        return;
      }
      await this.storeProfileEmbedding(payload, narrative);
    } catch (error) {
      this.logger.error(
        `Profile embedding failed for profile ${payload.profile_id}: ${error instanceof Error ? error.message : String(error)}`,
      );
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

    return this.loadAndFormatAnswers(batchId, questions);
  }

  private async loadAndFormatAnswers(
    batchId: string,
    questions: Array<{ id: string; question_text: string }>,
  ): Promise<string | null> {
    const supabase = this.supabaseService.getAdminClient();
    const questionIds = questions.map((q) => q.id);

    const { data: answers, error } = await supabase
      .from('intake_answers')
      .select('question_id, answer_text, answer_numeric, selected_options')
      .in('question_id', questionIds);

    if (error !== null) {
      this.logger.error(
        `Failed to load answers for batch ${batchId}: ${error.message}`,
      );
      return null;
    }

    const answerMap = new Map(
      answers.map((a: Record<string, unknown>) => [a.question_id as string, a]),
    );
    return questions
      .map((q) => {
        const answer = answerMap.get(q.id);
        return `Q: ${q.question_text}\nA: ${formatSingleAnswer(answer)}`;
      })
      .join('\n\n');
  }

  private async storeBatchEmbedding(
    payload: BatchAnsweredEvent,
    contentText: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const embedding = await this.aiService.generateEmbedding(contentText);
    const { error } = await supabase.from('context_embeddings').insert({
      goal_id: payload.goal_id,
      user_id: payload.user_id,
      content_type: 'intake_answer',
      batch_id: payload.batch_id,
      content_text: contentText,
      embedding: JSON.stringify(embedding),
    });
    if (error !== null) {
      this.logger.error(
        `Failed to store batch embedding for batch ${payload.batch_id}: ${error.message}`,
      );
      return;
    }
    await supabase
      .from('intake_batches')
      .update({ embedded: true })
      .eq('id', payload.batch_id);
    this.logger.log(
      `Batch ${String(payload.batch_number)} embedded for goal ${payload.goal_id}`,
    );
  }

  private async loadProfileNarrative(
    profileId: string,
  ): Promise<string | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('goal_profiles')
      .select('narrative_summary')
      .eq('id', profileId)
      .single();
    if (error !== null) {
      this.logger.error(
        `Failed to load profile ${profileId}: ${error.message}`,
      );
      return null;
    }
    return data.narrative_summary;
  }

  private async storeProfileEmbedding(
    payload: ProfileGeneratedEvent,
    narrative: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const embedding = await this.aiService.generateEmbedding(narrative);
    const { error } = await supabase.from('context_embeddings').insert({
      goal_id: payload.goal_id,
      user_id: payload.user_id,
      content_type: 'goal_profile',
      profile_id: payload.profile_id,
      content_text: narrative,
      embedding: JSON.stringify(embedding),
    });
    if (error !== null) {
      this.logger.error(
        `Failed to store profile embedding for profile ${payload.profile_id}: ${error.message}`,
      );
      return;
    }
    await supabase
      .from('goal_profiles')
      .update({ embedded: true })
      .eq('id', payload.profile_id);
    this.logger.log(`Profile embedded for goal ${payload.goal_id}`);
  }
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
