import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { AiService } from "../ai/ai.service.js";
import type { Json } from "../supabase/database.types.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import { WEEKLY_TASK_JUDGE_SYSTEM_PROMPT } from "./prompts/quality-prompts.js";
import {
  checkWarnings,
  clampScore,
  evaluateQuality,
} from "./quality-helpers.js";
import type {
  WeeklyTaskQualityScores,
  WeeklyTasksGeneratedEvent,
} from "./types/quality.types.js";

const PLAN_SCORE_DIMENSIONS = 3;
const JSON_INDENT = 2;
const SCORE_DECIMAL_PLACES = 2;

@Injectable()
export class QualityWeeklyTaskService {
  private readonly logger = new Logger(QualityWeeklyTaskService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @OnEvent("weekly-tasks.generated")
  public async handleWeeklyTasksGenerated(
    payload: WeeklyTasksGeneratedEvent,
  ): Promise<void> {
    try {
      await this.evaluateAndStore(payload);
    } catch (error) {
      this.logger.error(
        `Weekly task quality evaluation failed (goal ${payload.goalId}, plan ${payload.weeklyPlanId}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async evaluateAndStore(
    payload: WeeklyTasksGeneratedEvent,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const context = await this.loadTaskContext(supabase, payload);
    if (context === null) {
      return;
    }

    const rawScores = await evaluateQuality<WeeklyTaskQualityScores>({
      aiService: this.aiService,
      content: context.content,
      context: context.planContext,
      systemPrompt: WEEKLY_TASK_JUDGE_SYSTEM_PROMPT,
    });

    const scores = this.buildScores(rawScores);
    const { error: updateError } = await supabase
      .from("weekly_tasks")
      .update({ quality_scores: scores as unknown as Json })
      .in("id", context.taskIds);

    if (updateError !== null) {
      this.logger.error(
        `Failed to store weekly task quality scores (goal ${payload.goalId}, plan ${payload.weeklyPlanId}): ${updateError.message}`,
      );
      return;
    }

    checkWarnings({
      logger: this.logger,
      generationType: "weekly_task",
      scores,
      goalId: payload.goalId,
    });
    this.logger.log(
      `Weekly task quality scores for goal ${payload.goalId}: composite=${scores.composite.toFixed(SCORE_DECIMAL_PLACES)}`,
    );
  }

  private async loadTaskContext(
    supabase: ReturnType<SupabaseService["getAdminClient"]>,
    payload: WeeklyTasksGeneratedEvent,
  ): Promise<{
    content: string;
    planContext: string;
    taskIds: string[];
  } | null> {
    const tasks = await this.loadTasks(supabase, payload);
    if (tasks === null) {
      return null;
    }

    if (tasks.every((task) => task.is_fallback)) {
      this.logger.log(
        `Skipping quality evaluation for fallback tasks (goal ${payload.goalId}, plan ${payload.weeklyPlanId})`,
      );
      return null;
    }

    const plan = await this.loadWeeklyPlan(supabase, payload.weeklyPlanId);
    if (plan === null) {
      return null;
    }

    const content = JSON.stringify(
      tasks.map((t) => ({
        title: t.title,
        description: t.description,
        difficulty_rating: t.difficulty_rating,
        is_fallback: t.is_fallback,
      })),
      null,
      JSON_INDENT,
    );
    const planContext = `Weekly Plan Objectives: ${JSON.stringify(plan.objectives)}\nTask Count: ${String(tasks.length)}`;
    const taskIds = tasks.map((t) => t.id);
    return { content, planContext, taskIds };
  }

  private async loadTasks(
    supabase: ReturnType<SupabaseService["getAdminClient"]>,
    payload: WeeklyTasksGeneratedEvent,
  ): Promise<Array<{
    id: string;
    title: string;
    description: string;
    difficulty_rating: string | null;
    is_fallback: boolean;
  }> | null> {
    const { data, error } = await supabase
      .from("weekly_tasks")
      .select("id, title, description, difficulty_rating, is_fallback")
      .eq("goal_id", payload.goalId)
      .eq("weekly_plan_id", payload.weeklyPlanId);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (error !== null || data === null || data.length === 0) {
      this.logger.error(
        `Failed to load weekly tasks for quality evaluation (goal ${payload.goalId}, plan ${payload.weeklyPlanId}): ${error?.message}`,
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

  private async loadWeeklyPlan(
    supabase: ReturnType<SupabaseService["getAdminClient"]>,
    weeklyPlanId: string,
  ): Promise<{ objectives: string[] } | null> {
    const { data, error } = await supabase
      .from("weekly_plans")
      .select("objectives")
      .eq("id", weeklyPlanId)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (error !== null || data === null) {
      this.logger.error(
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        `Failed to load weekly plan for quality evaluation (plan ${weeklyPlanId}): ${error?.message}`,
      );
      return null;
    }
    return data as { objectives: string[] };
  }

  private buildScores(
    rawScores: WeeklyTaskQualityScores,
  ): WeeklyTaskQualityScores {
    const clamped = {
      weekly_plan_alignment: clampScore(rawScores.weekly_plan_alignment),
      specificity: clampScore(rawScores.specificity),
      achievability: clampScore(rawScores.achievability),
    };
    const composite =
      (clamped.weekly_plan_alignment +
        clamped.specificity +
        clamped.achievability) /
      PLAN_SCORE_DIMENSIONS;

    return { ...clamped, composite };
  }
}
