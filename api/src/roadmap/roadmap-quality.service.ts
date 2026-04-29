import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { AiService } from "../ai/ai.service.js";
import { config } from "../config/app.config.js";
import type { Json } from "../supabase/database.types.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import {
  MILESTONE_JUDGE_SYSTEM_PROMPT,
  WEEKLY_PLAN_JUDGE_SYSTEM_PROMPT,
  WEEKLY_TASK_JUDGE_SYSTEM_PROMPT,
} from "./prompts/quality-prompts.js";
import type {
  GenerationType,
  MilestoneQualityScores,
  RoadmapGeneratedEvent,
  WeeklyPlanGeneratedEvent,
  WeeklyPlanQualityScores,
  WeeklyTaskQualityScores,
  WeeklyTasksGeneratedEvent,
} from "./types/quality.types.js";

const MIN_SCORE = 0;
const MAX_SCORE = 5;
const LOW_SCORE_THRESHOLD = 3;
const MILESTONE_SCORE_DIMENSIONS = 4;
const PLAN_SCORE_DIMENSIONS = 3;
const SCORE_DECIMAL_PLACES = 2;
const JSON_INDENT = 2;

type AdminClient = ReturnType<SupabaseService["getAdminClient"]>;

@Injectable()
export class RoadmapQualityService {
  private readonly logger = new Logger(RoadmapQualityService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @OnEvent("roadmap.generated")
  public async handleRoadmapGenerated(
    payload: RoadmapGeneratedEvent,
  ): Promise<void> {
    try {
      await this.evaluateMilestones(payload);
    } catch (error) {
      this.logger.error(
        `Milestone quality evaluation failed (goal ${payload.goalId}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @OnEvent("weekly-plan.generated")
  public async handleWeeklyPlanGenerated(
    payload: WeeklyPlanGeneratedEvent,
  ): Promise<void> {
    try {
      await this.evaluateWeeklyPlan(payload);
    } catch (error) {
      this.logger.error(
        `Weekly plan quality evaluation failed (plan ${payload.planId}, goal ${payload.goalId}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @OnEvent("weekly-tasks.generated")
  public async handleWeeklyTasksGenerated(
    payload: WeeklyTasksGeneratedEvent,
  ): Promise<void> {
    try {
      await this.evaluateWeeklyTasks(payload);
    } catch (error) {
      this.logger.error(
        `Weekly task quality evaluation failed (goal ${payload.goalId}, plan ${payload.weeklyPlanId}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async evaluateMilestones(
    payload: RoadmapGeneratedEvent,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const context = await this.loadMilestoneContext(supabase, payload);
    if (context === null) {
      return;
    }

    const rawScores = await this.evaluate<MilestoneQualityScores>({
      content: context.content,
      context: context.goalContext,
      systemPrompt: MILESTONE_JUDGE_SYSTEM_PROMPT,
    });

    const scores = this.buildMilestoneScores(rawScores);
    const { error: updateError } = await supabase
      .from("goals")
      .update({ roadmap_quality_scores: scores as unknown as Json })
      .eq("id", payload.goalId);

    if (updateError !== null) {
      this.logger.error(
        `Failed to store milestone quality scores (goal ${payload.goalId}): ${updateError.message}`,
      );
      return;
    }

    this.checkWarnings("milestone", scores, payload.goalId);
    this.logger.log(
      `Milestone quality scores for goal ${payload.goalId}: composite=${scores.composite.toFixed(SCORE_DECIMAL_PLACES)}`,
    );
  }

  private async evaluateWeeklyPlan(
    payload: WeeklyPlanGeneratedEvent,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const context = await this.loadWeeklyPlanContext(supabase, payload);
    if (context === null) {
      return;
    }

    const rawScores = await this.evaluate<WeeklyPlanQualityScores>({
      content: context.content,
      context: context.milestoneContext,
      systemPrompt: WEEKLY_PLAN_JUDGE_SYSTEM_PROMPT,
    });

    const scores = this.buildWeeklyPlanScores(rawScores);
    const { error: updateError } = await supabase
      .from("weekly_plans")
      .update({ quality_scores: scores as unknown as Json })
      .eq("id", payload.planId);

    if (updateError !== null) {
      this.logger.error(
        `Failed to store weekly plan quality scores (plan ${payload.planId}): ${updateError.message}`,
      );
      return;
    }

    this.checkWarnings("weekly_plan", scores, payload.goalId);
    this.logger.log(
      `Weekly plan quality scores for goal ${payload.goalId}: composite=${scores.composite.toFixed(SCORE_DECIMAL_PLACES)}`,
    );
  }

  private async evaluateWeeklyTasks(
    payload: WeeklyTasksGeneratedEvent,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const context = await this.loadTaskContext(supabase, payload);
    if (context === null) {
      return;
    }

    const rawScores = await this.evaluate<WeeklyTaskQualityScores>({
      content: context.content,
      context: context.planContext,
      systemPrompt: WEEKLY_TASK_JUDGE_SYSTEM_PROMPT,
    });

    const scores = this.buildWeeklyTaskScores(rawScores);
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

    this.checkWarnings("weekly_task", scores, payload.goalId);
    this.logger.log(
      `Weekly task quality scores for goal ${payload.goalId}: composite=${scores.composite.toFixed(SCORE_DECIMAL_PLACES)}`,
    );
  }

  private async loadMilestoneContext(
    supabase: AdminClient,
    payload: RoadmapGeneratedEvent,
  ): Promise<{ content: string; goalContext: string } | null> {
    const roadmap = await this.loadRoadmapMetadata(supabase, payload.goalId);
    if (roadmap === null) {
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

  private async loadWeeklyPlanContext(
    supabase: AdminClient,
    payload: WeeklyPlanGeneratedEvent,
  ): Promise<{ content: string; milestoneContext: string } | null> {
    const { data: plan, error: planError } = await supabase
      .from("weekly_plans")
      .select("id, objectives, milestone_id")
      .eq("id", payload.planId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (planError !== null || plan === null) {
      this.logger.error(
        `Failed to load weekly plan for quality evaluation (${payload.planId}): ${planError.message}`,
      );
      return null;
    }

    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select("title, description, expected_outcome")
      .eq("id", plan.milestone_id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (milestoneError !== null || milestone === null) {
      this.logger.error(
        `Failed to load milestone for quality evaluation (${plan.milestone_id}): ${milestoneError.message}`,
      );
      return null;
    }

    const content = JSON.stringify(
      { objectives: plan.objectives },
      null,
      JSON_INDENT,
    );
    const milestoneContext = `Milestone: ${milestone.title}\nDescription: ${milestone.description}\nExpected Outcome: ${milestone.expected_outcome}`;
    return { content, milestoneContext };
  }

  private async loadTaskContext(
    supabase: AdminClient,
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

    const plan = await this.loadWeeklyPlanForTasks(
      supabase,
      payload.weeklyPlanId,
    );
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

  private async loadRoadmapMetadata(
    supabase: AdminClient,
    goalId: string,
  ): Promise<{ id: string } | null> {
    const { data, error } = await supabase
      .from("goals")
      .select("id, roadmap_generation_metadata")
      .eq("id", goalId)
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
    supabase: AdminClient,
    goalId: string,
  ): Promise<unknown[] | null> {
    const { data, error } = await supabase
      .from("milestones")
      .select(
        "title, description, expected_outcome, is_monthly_checkpoint, order_index",
      )
      .eq("goal_id", goalId)
      .order("order_index");
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
    supabase: AdminClient,
    goalId: string,
  ): Promise<{ title: string; description: string } | null> {
    const { data, error } = await supabase
      .from("goals")
      .select("title, description")
      .eq("id", goalId)
      .is("deleted_at", null)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (error !== null || data === null) {
      this.logger.error(
        `Failed to load goal for quality evaluation (${goalId}): ${error.message}`,
      );
      return null;
    }
    return data;
  }

  private async loadTasks(
    supabase: AdminClient,
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
    return data;
  }

  private async loadWeeklyPlanForTasks(
    supabase: AdminClient,
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

  private buildMilestoneScores(
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

  private buildWeeklyPlanScores(
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

  private buildWeeklyTaskScores(
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

  private async evaluate<T>(params: {
    content: string;
    context: string;
    systemPrompt: string;
  }): Promise<T> {
    const userPrompt = `## Content to Evaluate\n${params.content}\n\n## Context\n${params.context}`;
    const { data } = await this.aiService.generateJson<T>(
      params.systemPrompt,
      userPrompt,
      config.eval.judgeModel,
    );
    return data;
  }

  private checkWarnings(
    generationType: GenerationType,
    scores:
      | MilestoneQualityScores
      | WeeklyPlanQualityScores
      | WeeklyTaskQualityScores,
    goalId: string,
  ): void {
    for (const [dimension, value] of Object.entries(scores)) {
      if (dimension === "composite") {
        continue;
      }
      if ((value as number) < LOW_SCORE_THRESHOLD) {
        this.logger.warn(
          `Low ${generationType} quality score for goal ${goalId}: ${dimension}=${String(value)}/5`,
        );
      }
    }
  }
}

function clampScore(score: number): number {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(score)));
}
