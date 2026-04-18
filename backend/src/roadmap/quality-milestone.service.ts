import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AiService } from '../ai/ai.service.js';
import type { Json } from '../supabase/database.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { MILESTONE_JUDGE_SYSTEM_PROMPT } from './prompts/quality-prompts.js';
import {
  checkWarnings,
  clampScore,
  evaluateQuality,
} from './quality-helpers.js';
import type {
  MilestoneQualityScores,
  RoadmapGeneratedEvent,
} from './types/quality.types.js';

const MILESTONE_SCORE_DIMENSIONS = 4;
const JSON_INDENT = 2;

@Injectable()
export class QualityMilestoneService {
  private readonly logger = new Logger(QualityMilestoneService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @OnEvent('roadmap.generated')
  public async handleRoadmapGenerated(
    payload: RoadmapGeneratedEvent,
  ): Promise<void> {
    try {
      await this.evaluateAndStore(payload);
    } catch (error) {
      this.logger.error(
        `Milestone quality evaluation failed (goal ${payload.goalId}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async evaluateAndStore(
    payload: RoadmapGeneratedEvent,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const context = await this.loadMilestoneContext(supabase, payload);
    if (context === null) {
      return;
    }

    const rawScores = await evaluateQuality<MilestoneQualityScores>({
      aiService: this.aiService,
      content: context.content,
      context: context.goalContext,
      systemPrompt: MILESTONE_JUDGE_SYSTEM_PROMPT,
    });

    const scores = this.buildScores(rawScores);
    const { error: updateError } = await supabase
      .from('goals')
      .update({ roadmap_quality_scores: scores as unknown as Json })
      .eq('id', payload.goalId);

    if (updateError !== null) {
      this.logger.error(
        `Failed to store milestone quality scores (goal ${payload.goalId}): ${updateError.message}`,
      );
      return;
    }

    checkWarnings({
      logger: this.logger,
      generationType: 'milestone',
      scores,
      goalId: payload.goalId,
    });
    this.logger.log(
      `Milestone quality scores for goal ${payload.goalId}: composite=${scores.composite.toFixed(JSON_INDENT)}`,
    );
  }

  private async loadMilestoneContext(
    supabase: ReturnType<SupabaseService['getAdminClient']>,
    payload: RoadmapGeneratedEvent,
  ): Promise<{ content: string; goalContext: string } | null> {
    const roadmapData = await this.loadRoadmapMetadata(supabase, payload.goalId);
    if (roadmapData === null) {
      return null;
    }

    const milestones = await this.loadMilestones(supabase, payload.goalId);
    if (milestones === null) {
      return null;
    }

    const goal = await this.loadGoal(supabase, payload.goalId);
    if (goal === null) {
      return null;
    }

    const content = JSON.stringify(milestones, null, JSON_INDENT);
    const goalContext = `Goal: ${goal.title}\nDescription: ${goal.description}`;
    return { content, goalContext };
  }

  private async loadRoadmapMetadata(
    supabase: ReturnType<SupabaseService['getAdminClient']>,
    goalId: string,
  ): Promise<{ id: string } | null> {
    const { data, error } = await supabase
      .from('goals')
      .select('id, roadmap_generation_metadata')
      .eq('id', goalId)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (error !== null || data === null) {
      this.logger.error(
        `Failed to load roadmap for quality evaluation (${goalId}): ${error.message}`,
      );
      return null;
    }
    return { id: data.id };
  }

  private async loadMilestones(
    supabase: ReturnType<SupabaseService['getAdminClient']>,
    goalId: string,
  ): Promise<unknown[] | null> {
    const { data, error } = await supabase
      .from('milestones')
      .select(
        'title, description, expected_outcome, is_monthly_checkpoint, order_index',
      )
      .eq('goal_id', goalId)
      .order('order_index');
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (error !== null || data === null || data.length === 0) {
      this.logger.error(
        `Failed to load milestones for quality evaluation (goal ${goalId}): ${error?.message}`,
      );
      return null;
    }
    return data;
  }

  private async loadGoal(
    supabase: ReturnType<SupabaseService['getAdminClient']>,
    goalId: string,
  ): Promise<{ title: string; description: string } | null> {
    const { data, error } = await supabase
      .from('goals')
      .select('title, description')
      .eq('id', goalId)
      .is('deleted_at', null)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (error !== null || data === null) {
      this.logger.error(
        `Failed to load goal for quality evaluation (${goalId}): ${error.message}`,
      );
      return null;
    }
    return data as { title: string; description: string };
  }

  private buildScores(
    rawScores: MilestoneQualityScores,
  ): MilestoneQualityScores {
    const clamped = {
      coherence: clampScore(rawScores.coherence),
      personalization: clampScore(rawScores.personalization),
      progression: clampScore(rawScores.progression),
      deadline_alignment: clampScore(rawScores.deadline_alignment),
    };
    const composite =
      (clamped.coherence +
        clamped.personalization +
        clamped.progression +
        clamped.deadline_alignment) /
      MILESTONE_SCORE_DIMENSIONS;

    return { ...clamped, composite };
  }
}
