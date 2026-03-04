import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AiService } from '../ai/ai.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type {
  MonthlySummary,
  WeeklySummary,
} from './types/weekly-plan.types.js';

interface DebriefSubmittedPayload {
  debriefId: string;
  goalId: string;
  userId: string;
  note: string;
}

interface SummaryGeneratedPayload {
  planId: string;
  goalId: string;
  userId: string;
  summary: WeeklySummary | MonthlySummary;
  contentText: string;
}

@Injectable()
export class SummaryEmbeddingService {
  private readonly logger = new Logger(SummaryEmbeddingService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @OnEvent('debrief.submitted')
  public async handleDebriefSubmitted(
    payload: DebriefSubmittedPayload,
  ): Promise<void> {
    try {
      const embedding = await this.aiService.generateEmbedding(payload.note);

      const supabase = this.supabaseService.getAdminClient();
      const { error: insertError } = await supabase
        .from('context_embeddings')
        .insert({
          goal_id: payload.goalId,
          user_id: payload.userId,
          content_type: 'debrief_note',
          content_text: payload.note,
          embedding: JSON.stringify(embedding),
        });

      if (insertError !== null) {
        this.logger.error(
          `Failed to store debrief embedding for debrief ${payload.debriefId}: ${insertError.message}`,
        );
        return;
      }

      this.logger.log(
        `Debrief embedded for goal ${payload.goalId}, debrief ${payload.debriefId}`,
      );
    } catch (error) {
      this.logger.error(
        `Debrief embedding failed for debrief ${payload.debriefId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @OnEvent('summary.generated')
  public async handleSummaryGenerated(
    payload: SummaryGeneratedPayload,
  ): Promise<void> {
    try {
      const embedding = await this.aiService.generateEmbedding(
        payload.contentText,
      );

      const supabase = this.supabaseService.getAdminClient();
      const { error: insertError } = await supabase
        .from('context_embeddings')
        .insert({
          goal_id: payload.goalId,
          user_id: payload.userId,
          content_type: 'weekly_summary',
          content_text: payload.contentText,
          embedding: JSON.stringify(embedding),
        });

      if (insertError !== null) {
        this.logger.error(
          `Failed to store summary embedding for plan ${payload.planId}: ${insertError.message}`,
        );
        return;
      }

      this.logger.log(
        `Summary embedded for goal ${payload.goalId}, plan ${payload.planId}`,
      );
    } catch (error) {
      this.logger.error(
        `Summary embedding failed for plan ${payload.planId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
