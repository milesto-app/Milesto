import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { AiService } from "../ai/ai.service.js";
import { UserLanguageService } from "../common/user-language.service.js";
import { config } from "../config/app.config.js";
import type { Json } from "../supabase/database.types.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import { UsageService } from "../usage/usage.service.js";
import { GenerationType } from "../usage/usage.types.js";
import {
  buildMonthlySummaryNarrativeSystemPrompt,
  buildMonthlySummaryNarrativeUserPrompt,
  buildWeeklySummaryNarrativeSystemPrompt,
  buildWeeklySummaryNarrativeUserPrompt,
} from "./prompts/weekly-plan-prompts.js";
import { RoadmapContextService } from "./roadmap-context.service.js";
import { RoadmapDataService } from "./roadmap-data.service.js";
import { RoadmapGenerationService } from "./roadmap-generation.service.js";
import type { Milestone, Roadmap } from "./types/roadmap.types.js";
import type {
  GenerateAndStoreParams,
  GenerationContext,
  MonthlySummary,
  WeekData,
  WeeklyPlan,
  WeeklySummary,
} from "./types/weekly-plan.types.js";

const DAYS_PER_WEEK = 7;
const MONTHLY_SUMMARY_MIN_PLANS = 2;
const PERCENTAGE_MULTIPLIER = 100;

type AdminClient = ReturnType<SupabaseService["getAdminClient"]>;
type MilestoneRef = { target_month: number; id: string };

interface MonthlyParams {
  supabase: AdminClient;
  milestone: MilestoneRef;
  goalId: string;
  userId: string;
  language: string;
}

@Injectable()
export class WeeklyPlanService {
  private readonly logger = new Logger(WeeklyPlanService.name);

  constructor(
    private readonly contextPipeline: RoadmapContextService,
    private readonly generation: RoadmapGenerationService,
    private readonly aiService: AiService,
    private readonly storage: RoadmapDataService,
    private readonly languageService: UserLanguageService,
    private readonly usageService: UsageService,
    private readonly supabaseService: SupabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  public async getCurrentWeeklyPlan(
    goalId: string,
    userId: string,
  ): Promise<WeeklyPlan | null> {
    return this.storage.getCurrentWeeklyPlan(goalId, userId);
  }

  public async generateWeeklyPlan(
    goalId: string,
    userId: string,
  ): Promise<WeeklyPlan> {
    await this.storage.autoCompleteExpiredPlans(goalId, DAYS_PER_WEEK);
    const language = await this.languageService.getLanguage(userId);
    await this.summarizePreviousWeek(goalId, userId, language);
    await this.generateMonthlySummaryIfNeeded({ goalId, userId, language });
    return this.buildAndGeneratePlan(goalId, userId, language);
  }

  public async queryWeekData(
    plan: WeeklyPlan,
    goalId: string,
  ): Promise<WeekData> {
    const supabase = this.supabaseService.getAdminClient();
    let tasksTotal = 0;
    const tasksCompleted = await this.queryTaskData(
      supabase,
      goalId,
      plan.id,
      (total, completed) => {
        tasksTotal = total;
        return completed;
      },
    );
    const debriefNotes: string[] = [];
    await this.queryDebriefData(supabase, goalId, plan.id, debriefNotes);
    return { tasksCompleted, tasksTotal, debriefNotes };
  }

  public async getActiveRoadmapAndMilestone(
    goalId: string,
    userId: string,
  ): Promise<{ roadmap: Roadmap; milestone: Milestone }> {
    return this.storage.loadRoadmapAndMilestone(goalId, userId);
  }

  private async buildAndGeneratePlan(
    goalId: string,
    userId: string,
    language: string,
  ): Promise<WeeklyPlan> {
    const { roadmap, milestone } = await this.getActiveRoadmapAndMilestone(
      goalId,
      userId,
    );
    const weekNumber = await this.storage.calculateWeekNumber(goalId);
    const lastCompleted =
      await this.storage.getLastCompletedPlanWithoutSummary(goalId);
    const ms = milestone as Milestone & {
      monthly_summary?: MonthlySummary | null;
    };
    const generationContext: GenerationContext = {
      milestone_title: ms.title,
      milestone_description: ms.description,
      milestone_expected_outcome: ms.expected_outcome,
      last_weekly_summary: lastCompleted?.summary ?? null,
      last_monthly_summary:
        (ms.monthly_summary as Record<string, unknown> | null) ?? null,
    };

    try {
      return await this.generateAndStorePlan({
        goalId,
        userId,
        roadmap,
        milestone,
        weekNumber,
        generationContext,
        language,
      });
    } catch (error) {
      this.logger.warn(
        `Weekly plan generation failed, creating fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.createFallbackOrThrow(milestone, goalId, userId, weekNumber);
    }
  }

  private async generateAndStorePlan(
    params: GenerateAndStoreParams,
  ): Promise<WeeklyPlan> {
    const context = await this.contextPipeline.assembleContext(
      params.goalId,
      params.userId,
    );
    await this.usageService.reserveGeneration(
      params.userId,
      GenerationType.WEEKLY_PLAN,
    );
    const { plan: generated, metadata } =
      await this.generation.generateWeeklyPlan({
        context,
        milestone: params.milestone,
        weekNumber: params.weekNumber,
        generationContext: params.generationContext,
        language: params.language,
      });
    await this.usageService.record(params.userId, GenerationType.WEEKLY_PLAN, {
      promptTokens: metadata.prompt_tokens,
      completionTokens: metadata.completion_tokens,
      model: metadata.model_used,
    });

    const weeklyPlan = await this.storage.storeWeeklyPlan({
      milestone_id: params.milestone.id,
      goal_id: params.goalId,
      user_id: params.userId,
      week_number: params.weekNumber,
      week_start_date: this.storage.getCurrentWeekStart(),
      objectives: generated.objectives,
      generation_context: params.generationContext as unknown as Record<
        string,
        unknown
      >,
      is_fallback: false,
      model_used: metadata.model_used,
      generation_metadata: metadata as unknown as Record<string, unknown>,
    });

    this.storage.emitPlanGenerated(weeklyPlan.id, params.goalId);
    return weeklyPlan;
  }

  private async createFallbackOrThrow(
    milestone: Milestone,
    goalId: string,
    userId: string,
    weekNumber: number,
  ): Promise<WeeklyPlan> {
    try {
      this.logger.warn(
        `Creating fallback weekly plan for goal ${goalId}, week ${String(weekNumber)}`,
      );
      return await this.storage.storeWeeklyPlan({
        milestone_id: milestone.id,
        goal_id: goalId,
        user_id: userId,
        week_number: weekNumber,
        week_start_date: this.storage.getCurrentWeekStart(),
        objectives: [milestone.expected_outcome],
        generation_context: {},
        is_fallback: true,
        model_used: null,
        generation_metadata: {},
      });
    } catch (fallbackError) {
      this.storage.warnFallbackFailed(fallbackError);
    }
  }

  private async summarizePreviousWeek(
    goalId: string,
    userId: string,
    language: string,
  ): Promise<void> {
    const lastCompleted =
      await this.storage.getLastCompletedPlanWithoutSummary(goalId);
    if (lastCompleted === null) {
      return;
    }

    const weekData = await this.queryWeekData(lastCompleted, goalId);
    const summary = await this.generateWeeklySummary(
      lastCompleted,
      weekData,
      language,
    );
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("weekly_plans")
      .update({ summary: summary as unknown as Json })
      .eq("id", lastCompleted.id);
    if (error) {
      this.logger.warn(
        `Failed to persist weekly summary for plan ${lastCompleted.id}: ${error.message}`,
      );
    }
    const contentText = formatSummaryForEmbedding(
      summary,
      lastCompleted.week_number,
    );
    this.eventEmitter.emit("summary.generated", {
      planId: lastCompleted.id,
      goalId,
      userId,
      summary,
      contentText,
    });
  }

  private async generateMonthlySummaryIfNeeded(params: {
    goalId: string;
    userId: string | undefined;
    language: string;
  }): Promise<void> {
    try {
      const plans = await this.loadRecentCompletedPlans(params.goalId);
      if (plans === null || plans.length < MONTHLY_SUMMARY_MIN_PLANS) {
        return;
      }
      await this.checkAndGenerateMonthly({
        plans,
        goalId: params.goalId,
        userId: params.userId,
        language: params.language,
      });
    } catch (error) {
      this.logger.warn(
        `Monthly summary generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async loadRecentCompletedPlans(
    goalId: string,
  ): Promise<unknown[] | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from("weekly_plans")
      .select("*, milestones!inner(target_month, id)")
      .eq("goal_id", goalId)
      .eq("status", "completed")
      .order("week_number", { ascending: false })
      .limit(MONTHLY_SUMMARY_MIN_PLANS);
    return data;
  }

  private async checkAndGenerateMonthly(params: {
    plans: unknown[];
    goalId: string;
    userId: string | undefined;
    language: string;
  }): Promise<void> {
    const current = (params.plans[0] as Record<string, unknown>)
      .milestones as MilestoneRef;
    const previous = (params.plans[1] as Record<string, unknown>)
      .milestones as MilestoneRef;
    if (current.target_month === previous.target_month) {
      return;
    }
    const supabase = this.supabaseService.getAdminClient();
    const resolvedUserId =
      params.userId ??
      ((params.plans[0] as Record<string, unknown>).user_id as string);
    await this.storeMonthlySummary({
      supabase,
      milestone: previous,
      goalId: params.goalId,
      userId: resolvedUserId,
      language: params.language,
    });
  }

  private async storeMonthlySummary(params: MonthlyParams): Promise<void> {
    const { data: row } = await params.supabase
      .from("milestones")
      .select("monthly_summary")
      .eq("id", params.milestone.id)
      .single();
    if (row?.monthly_summary !== null && row?.monthly_summary !== undefined) {
      return;
    }
    const summaries = await this.loadWeeklySummaries(
      params.supabase,
      params.milestone.id,
    );
    if (summaries.length === 0) {
      return;
    }
    const monthly = await this.generateMonthlySummary(
      summaries,
      params.language,
    );
    await this.persistAndEmitMonthlySummary(params, monthly);
  }

  private async loadWeeklySummaries(
    supabase: AdminClient,
    milestoneId: string,
  ): Promise<WeeklySummary[]> {
    const { data } = await supabase
      .from("weekly_plans")
      .select("summary")
      .eq("milestone_id", milestoneId)
      .eq("status", "completed")
      .not("summary", "is", null)
      .order("week_number", { ascending: true });
    if (data === null || data.length === 0) {
      return [];
    }
    return data.map((p: Record<string, unknown>) => p.summary as WeeklySummary);
  }

  private async persistAndEmitMonthlySummary(
    params: MonthlyParams,
    monthlySummary: MonthlySummary,
  ): Promise<void> {
    const { error } = await params.supabase
      .from("milestones")
      .update({ monthly_summary: monthlySummary as unknown as Json })
      .eq("id", params.milestone.id);
    if (error) {
      this.logger.warn(
        `Failed to store monthly summary on milestone ${params.milestone.id}: ${error.message}`,
      );
      return;
    }
    const contentText = formatMonthlySummaryForEmbedding(
      monthlySummary,
      params.milestone.target_month,
    );
    this.eventEmitter.emit("summary.generated", {
      planId: params.milestone.id,
      goalId: params.goalId,
      userId: params.userId,
      summary: monthlySummary,
      contentText,
    });
  }

  private async generateWeeklySummary(
    completedPlan: WeeklyPlan,
    weekData: WeekData,
    language: string,
  ): Promise<WeeklySummary> {
    const completionRate =
      weekData.tasksTotal > 0
        ? Math.round(
            (weekData.tasksCompleted / weekData.tasksTotal) *
              PERCENTAGE_MULTIPLIER,
          )
        : 0;

    const narrative = await this.tryGenerateNarrative({
      shouldGenerate: weekData.debriefNotes.length > 0,
      systemPrompt: buildWeeklySummaryNarrativeSystemPrompt(language),
      userPrompt: buildWeeklySummaryNarrativeUserPrompt(
        completionRate,
        weekData,
      ),
      label: "Weekly summary",
    });

    return {
      completion_rate: completionRate,
      tasks_completed: weekData.tasksCompleted,
      tasks_total: weekData.tasksTotal || completedPlan.objectives.length,
      debrief_count: weekData.debriefNotes.length,
      ...(narrative !== undefined ? { narrative } : {}),
    };
  }

  private async generateMonthlySummary(
    weeklySummaries: WeeklySummary[],
    language: string,
  ): Promise<MonthlySummary> {
    if (weeklySummaries.length === 0) {
      return {
        completion_rate: 0,
        tasks_completed: 0,
        tasks_total: 0,
        debrief_count: 0,
      };
    }

    const totals = aggregateWeeklyTotals(weeklySummaries);
    const weeklyNarratives = weeklySummaries
      .filter((ws) => ws.narrative !== undefined)
      .map((ws) => ws.narrative as string);

    const narrative = await this.tryGenerateNarrative({
      shouldGenerate: weeklyNarratives.length > 0,
      systemPrompt: buildMonthlySummaryNarrativeSystemPrompt(language),
      userPrompt: buildMonthlySummaryNarrativeUserPrompt({
        avgCompletionRate: totals.avgCompletionRate,
        totalCompleted: totals.totalCompleted,
        totalTasks: totals.totalTasks,
        weeklyNarratives,
      }),
      label: "Monthly summary",
    });

    return {
      ...totals.summary,
      ...(narrative !== undefined ? { narrative } : {}),
    };
  }

  private async tryGenerateNarrative(params: {
    shouldGenerate: boolean;
    systemPrompt: string;
    userPrompt: string;
    label: string;
  }): Promise<string | undefined> {
    if (!params.shouldGenerate) {
      return undefined;
    }
    try {
      const { data } = await this.aiService.generateJson<{
        narrative: string;
      }>(params.systemPrompt, params.userPrompt, config.ai.defaultModel);
      return data.narrative;
    } catch (error) {
      this.logger.warn(
        `${params.label} narrative generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    }
  }

  private async queryTaskData(
    supabase: AdminClient,
    goalId: string,
    weeklyPlanId: string,
    callback: (total: number, completed: number) => number,
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .from("weekly_tasks")
        .select("is_completed")
        .eq("goal_id", goalId)
        .eq("weekly_plan_id", weeklyPlanId);
      if (error) {
        this.logger.debug(`weekly_tasks query skipped: ${error.message}`);
        return callback(0, 0);
      }
      if (data.length > 0) {
        const total = data.length;
        const completed = data.filter(
          (d: { is_completed: boolean }) => d.is_completed,
        ).length;
        return callback(total, completed);
      }
    } catch (err) {
      this.logger.debug(
        `weekly_tasks query failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return callback(0, 0);
  }

  private async queryDebriefData(
    supabase: AdminClient,
    goalId: string,
    weeklyPlanId: string,
    debriefNotes: string[],
  ): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("debriefs")
        .select("note")
        .eq("goal_id", goalId)
        .eq("weekly_plan_id", weeklyPlanId)
        .not("note", "is", null);
      if (error) {
        this.logger.debug(`debriefs query skipped: ${error.message}`);
        return;
      }
      for (const row of data as Array<{ note: string }>) {
        if (row.note.length > 0) {
          debriefNotes.push(row.note);
        }
      }
    } catch (err) {
      this.logger.debug(
        `debriefs query failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

function aggregateWeeklyTotals(weeklySummaries: WeeklySummary[]): {
  totalCompleted: number;
  totalTasks: number;
  avgCompletionRate: number;
  summary: Omit<MonthlySummary, "narrative">;
} {
  const totalCompleted = weeklySummaries.reduce(
    (sum, ws) => sum + ws.tasks_completed,
    0,
  );
  const totalTasks = weeklySummaries.reduce(
    (sum, ws) => sum + ws.tasks_total,
    0,
  );
  const avgCompletionRate = Math.round(
    weeklySummaries.reduce((sum, ws) => sum + ws.completion_rate, 0) /
      weeklySummaries.length,
  );
  const totalDebriefs = weeklySummaries.reduce(
    (sum, ws) => sum + (ws.debrief_count ?? 0),
    0,
  );

  return {
    totalCompleted,
    totalTasks,
    avgCompletionRate,
    summary: {
      completion_rate: avgCompletionRate,
      tasks_completed: totalCompleted,
      tasks_total: totalTasks,
      debrief_count: totalDebriefs,
    },
  };
}

function formatSummaryForEmbedding(
  summary: WeeklySummary,
  weekNumber: number,
): string {
  const lines = [
    `Weekly Summary (Week ${String(weekNumber)}):`,
    `Completion: ${String(summary.tasks_completed)}/${String(summary.tasks_total)} (${String(summary.completion_rate)}%)`,
    `Debriefs: ${String(summary.debrief_count ?? 0)}`,
  ];
  if (summary.narrative !== undefined && summary.narrative.length > 0) {
    lines.push(summary.narrative);
  }
  return lines.join("\n");
}

function formatMonthlySummaryForEmbedding(
  summary: MonthlySummary,
  targetMonth: number,
): string {
  const lines = [
    `Monthly Summary (Month ${String(targetMonth)}):`,
    `Completion: ${String(summary.tasks_completed)}/${String(summary.tasks_total)} (${String(summary.completion_rate)}%)`,
    `Debriefs: ${String(summary.debrief_count)}`,
  ];
  if (summary.narrative !== undefined && summary.narrative.length > 0) {
    lines.push(summary.narrative);
  }
  return lines.join("\n");
}
