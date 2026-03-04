import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AiService } from '../ai/ai.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { WEEKLY_PLAN_JUDGE_SYSTEM_PROMPT } from './prompts/quality-prompts.js';
import {
  clampScore,
  checkWarnings,
  evaluateQuality,
} from './quality-helpers.js';
import type { Json } from '../supabase/database.types.js';
import type {
  WeeklyPlanQualityScores,
  WeeklyPlanGeneratedEvent,
} from './types/quality.types.js';

const PLAN_SCORE_DIMENSIONS = 3;
const SCORE_DECIMAL_PLACES = 2;

@Injectable()
export class QualityWeeklyService {
  private readonly logger = new Logger(QualityWeeklyService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @OnEvent('weekly-plan.generated')
  public async handleWeeklyPlanGenerated(
    payload: WeeklyPlanGeneratedEvent,
  ): Promise<void> {
    try {
      await this.evaluateAndStore(payload);
    } catch (error) {
      this.logger.error(
        `Weekly plan quality evaluation failed (plan ${payload.planId}, goal ${payload.goalId}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async evaluateAndStore(
    payload: WeeklyPlanGeneratedEvent,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const context = await this.loadWeeklyPlanContext(supabase, payload);
    if (context === null) {
      return;
    }

    const rawScores = await evaluateQuality<WeeklyPlanQualityScores>({
      aiService: this.aiService,
      content: context.content,
      context: context.milestoneContext,
      systemPrompt: WEEKLY_PLAN_JUDGE_SYSTEM_PROMPT,
    });

    const scores = this.buildScores(rawScores);
    const { error: updateError } = await supabase
      .from('weekly_plans')
      .update({ quality_scores: scores as unknown as Json })
      .eq('id', payload.planId);

    if (updateError !== null) {
      this.logger.error(
        `Failed to store weekly plan quality scores (plan ${payload.planId}): ${updateError.message}`,
      );
      return;
    }

    checkWarnings({
      logger: this.logger,
      generationType: 'weekly_plan',
      scores,
      goalId: payload.goalId,
    });
    this.logger.log(
      `Weekly plan quality scores for goal ${payload.goalId}: composite=${scores.composite.toFixed(SCORE_DECIMAL_PLACES)}`,
    );
  }

  private async loadWeeklyPlanContext(
    supabase: ReturnType<SupabaseService['getAdminClient']>,
    payload: WeeklyPlanGeneratedEvent,
  ): Promise<{ content: string; milestoneContext: string } | null> {
    const { data: plan, error: planError } = await supabase
      .from('weekly_plans')
      .select('id, focus, objectives, milestone_id')
      .eq('id', payload.planId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (planError !== null || plan === null) {
      this.logger.error(
        `Failed to load weekly plan for quality evaluation (${payload.planId}): ${planError.message}`,
      );
      return null;
    }

    const { data: milestone, error: milestoneError } = await supabase
      .from('milestones')
      .select('title, description, expected_outcome')
      .eq('id', plan.milestone_id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (milestoneError !== null || milestone === null) {
      this.logger.error(
        `Failed to load milestone for quality evaluation (${plan.milestone_id}): ${milestoneError.message}`,
      );
      return null;
    }

    const content = JSON.stringify(
      { focus: plan.focus, objectives: plan.objectives },
      null,
      SCORE_DECIMAL_PLACES,
    );
    const milestoneContext = `Milestone: ${milestone.title}\nDescription: ${milestone.description}\nExpected Outcome: ${milestone.expected_outcome}`;
    return { content, milestoneContext };
  }

  private buildScores(
    rawScores: WeeklyPlanQualityScores,
  ): WeeklyPlanQualityScores {
    const clamped = {
      milestone_alignment: clampScore(rawScores.milestone_alignment),
      progress_adaptation: clampScore(rawScores.progress_adaptation),
      actionability: clampScore(rawScores.actionability),
    };
    const composite =
      (clamped.milestone_alignment +
        clamped.progress_adaptation +
        clamped.actionability) /
      PLAN_SCORE_DIMENSIONS;

    return { ...clamped, composite };
  }
}
