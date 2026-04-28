import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { AiService } from "../ai/ai.service.js";
import { config } from "../config/app.config.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import { QUALITY_SCORE_DIMENSIONS } from "./constants/intake.constants.js";
import { QUALITY_JUDGE_SYSTEM_PROMPT } from "./prompts/intake-quality-prompts.js";
import type { BatchServedEvent } from "./types/intake.types.js";

const SCORE_DECIMAL_PLACES = 2;

interface QualityScores {
  relevance: number;
  depth_progression: number;
  dimension_coverage: number;
  redundancy_avoidance: number;
}

@Injectable()
export class IntakeQualityService {
  private readonly logger = new Logger(IntakeQualityService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @OnEvent("batch.served")
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
      .from("intake_questions")
      .select("question_text, question_type")
      .eq("batch_id", payload.batch_id)
      .order("order_in_batch");

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
      .from("goals")
      .select("description")
      .eq("id", goalId)
      .is("deleted_at", null)
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
      .from("intake_questions")
      .select("question_text, batch_number")
      .eq("goal_id", payload.goal_id)
      .lt("batch_number", payload.batch_number)
      .order("batch_number")
      .order("order_in_batch");
    return data ?? [];
  }

  private async evaluateQuality(params: {
    questions: Array<{ question_text: string; question_type: string }>;
    goalDescription: string;
    batchNumber: number;
    priorQuestions: Array<{ question_text: string; batch_number: number }>;
  }): Promise<QualityScores & { composite: number }> {
    const userPrompt = buildQualityUserPrompt(params);
    const scores = await this.aiService.generateJson<QualityScores>(
      QUALITY_JUDGE_SYSTEM_PROMPT,
      userPrompt,
    );
    return computeComposite(scores);
  }

  private async storeScore(batchId: string, composite: number): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("intake_batches")
      .update({ quality_score: composite })
      .eq("id", batchId);
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
    if (scores.composite < config.intake.qualityWarnThreshold) {
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

function buildQualityUserPrompt(params: {
  questions: Array<{ question_text: string; question_type: string }>;
  goalDescription: string;
  batchNumber: number;
  priorQuestions: Array<{ question_text: string; batch_number: number }>;
}): string {
  const { questions, goalDescription, batchNumber, priorQuestions } = params;
  const currentBatch = questions
    .map((q, i) => `${String(i + 1)}. [${q.question_type}] ${q.question_text}`)
    .join("\n");

  const priorSection =
    priorQuestions.length > 0
      ? `## Prior Batch Questions\n${priorQuestions.map((q) => `- [Batch ${String(q.batch_number)}] ${q.question_text}`).join("\n")}`
      : "## Prior Batch Questions\nNone (this is the first batch)";

  return `## Goal Description\n${goalDescription}\n\n## Current Batch (Batch ${String(batchNumber)})\n${currentBatch}\n\n${priorSection}\n\nScore this batch.`;
}

function computeComposite(
  scores: QualityScores,
): QualityScores & { composite: number } {
  const clamp = (v: number): number => Math.max(0, Math.min(1, v));
  const relevance = clamp(scores.relevance);
  const depthProgression = clamp(scores.depth_progression);
  const dimensionCoverage = clamp(scores.dimension_coverage);
  const redundancyAvoidance = clamp(scores.redundancy_avoidance);
  const composite =
    (relevance + depthProgression + dimensionCoverage + redundancyAvoidance) /
    QUALITY_SCORE_DIMENSIONS;
  return {
    relevance,
    depth_progression: depthProgression,
    dimension_coverage: dimensionCoverage,
    redundancy_avoidance: redundancyAvoidance,
    composite,
  };
}
