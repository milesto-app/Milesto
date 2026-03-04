import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AiService } from '../ai/ai.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { DAILY_OBJECTIVE_JUDGE_SYSTEM_PROMPT } from './prompts/quality-prompts.js';
import {
  clampScore,
  checkWarnings,
  evaluateQuality,
} from './quality-helpers.js';
import type { Json } from '../supabase/database.types.js';
import type {
  DailyObjectiveQualityScores,
  DailyObjectivesGeneratedEvent,
} from './types/quality.types.js';

const PLAN_SCORE_DIMENSIONS = 3;
const JSON_INDENT = 2;
const SCORE_DECIMAL_PLACES = 2;

@Injectable()
export class QualityDailyService {
  private readonly logger = new Logger(QualityDailyService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @OnEvent('daily-objectives.generated')
  public async handleDailyObjectivesGenerated(
    payload: DailyObjectivesGeneratedEvent,
  ): Promise<void> {
    try {
      await this.evaluateAndStore(payload);
    } catch (error) {
      this.logger.error(
        `Daily objective quality evaluation failed (goal ${payload.goalId}, date ${payload.date}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async evaluateAndStore(
    payload: DailyObjectivesGeneratedEvent,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const context = await this.loadDailyContext(supabase, payload);
    if (context === null) {
      return;
    }

    const rawScores = await evaluateQuality<DailyObjectiveQualityScores>({
      aiService: this.aiService,
      content: context.content,
      context: context.checkInContext,
      systemPrompt: DAILY_OBJECTIVE_JUDGE_SYSTEM_PROMPT,
    });

    const scores = this.buildScores(rawScores);
    const { error: updateError } = await supabase
      .from('daily_objectives')
      .update({ quality_scores: scores as unknown as Json })
      .in('id', context.objectiveIds);

    if (updateError !== null) {
      this.logger.error(
        `Failed to store daily objective quality scores (goal ${payload.goalId}, date ${payload.date}): ${updateError.message}`,
      );
      return;
    }

    checkWarnings({
      logger: this.logger,
      generationType: 'daily_objective',
      scores,
      goalId: payload.goalId,
    });
    this.logger.log(
      `Daily objective quality scores for goal ${payload.goalId}: composite=${scores.composite.toFixed(SCORE_DECIMAL_PLACES)}`,
    );
  }

  private async loadDailyContext(
    supabase: ReturnType<SupabaseService['getAdminClient']>,
    payload: DailyObjectivesGeneratedEvent,
  ): Promise<{
    content: string;
    checkInContext: string;
    objectiveIds: string[];
  } | null> {
    const objectives = await this.loadObjectives(supabase, payload);
    if (objectives === null) {
      return null;
    }

    if (objectives.every((obj) => obj.is_fallback)) {
      this.logger.log(
        `Skipping quality evaluation for fallback objectives (goal ${payload.goalId}, date ${payload.date})`,
      );
      return null;
    }

    const checkIn = await this.loadCheckIn(supabase, payload);
    if (checkIn === null) {
      return null;
    }

    const content = JSON.stringify(
      objectives.map((o) => ({
        title: o.title,
        description: o.description,
        difficulty_rating: o.difficulty_rating,
        is_fallback: o.is_fallback,
      })),
      null,
      JSON_INDENT,
    );
    const checkInContext = `Energy Level: ${checkIn.energy_level}\nObjective Count: ${String(objectives.length)}`;
    const objectiveIds = objectives.map((o) => o.id);
    return { content, checkInContext, objectiveIds };
  }

  private async loadObjectives(
    supabase: ReturnType<SupabaseService['getAdminClient']>,
    payload: DailyObjectivesGeneratedEvent,
  ): Promise<Array<{
    id: string;
    title: string;
    description: string;
    difficulty_rating: string | null;
    is_fallback: boolean;
  }> | null> {
    const { data, error } = await supabase
      .from('daily_objectives')
      .select('id, title, description, difficulty_rating, is_fallback')
      .eq('goal_id', payload.goalId)
      .eq('date', payload.date);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (error !== null || data === null || data.length === 0) {
      this.logger.error(
        `Failed to load daily objectives for quality evaluation (goal ${payload.goalId}, date ${payload.date}): ${error?.message}`,
      );
      return null;
    }
    return data as Array<{
      id: string;
      title: string;
      description: string;
      difficulty_rating: string | null;
      is_fallback: boolean;
    }>;
  }

  private async loadCheckIn(
    supabase: ReturnType<SupabaseService['getAdminClient']>,
    payload: DailyObjectivesGeneratedEvent,
  ): Promise<{ energy_level: string } | null> {
    const { data, error } = await supabase
      .from('check_ins')
      .select('energy_level')
      .eq('goal_id', payload.goalId)
      .eq('date', payload.date)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (error !== null || data === null) {
      this.logger.error(
        `Failed to load check-in for quality evaluation (goal ${payload.goalId}, date ${payload.date}): ${error.message}`,
      );
      return null;
    }
    return data as { energy_level: string };
  }

  private buildScores(
    rawScores: DailyObjectiveQualityScores,
  ): DailyObjectiveQualityScores {
    const clamped = {
      energy_calibration: clampScore(rawScores.energy_calibration),
      specificity: clampScore(rawScores.specificity),
      achievability: clampScore(rawScores.achievability),
    };
    const composite =
      (clamped.energy_calibration +
        clamped.specificity +
        clamped.achievability) /
      PLAN_SCORE_DIMENSIONS;

    return { ...clamped, composite };
  }
}
