import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { AiService } from "../ai/ai.service.js";
import { UserLanguageService } from "../common/user-language.service.js";
import { config } from "../config/app.config.js";
import type { Database, Json } from "../supabase/database.types.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import {
  buildMonthlySummaryNarrativeSystemPrompt,
  buildMonthlySummaryNarrativeUserPrompt,
  buildWeeklySummaryNarrativeSystemPrompt,
  buildWeeklySummaryNarrativeUserPrompt,
} from "./prompts/milestone-summary-prompts.js";
import { RoadmapContextService } from "./roadmap-context.service.js";
import type {
  GenerationContext,
  Milestone,
  MonthlySummary,
  WeekData,
  WeeklySummary,
} from "./types/roadmap.types.js";
import type { CurrentWeekResponse } from "./types/week-state.types.js";
import { WeekStateService } from "./week-state.service.js";

const PERCENTAGE_MULTIPLIER = 100;
const MONTHLY_SUMMARY_MIN_MILESTONES = 2;

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
export class MilestoneService {
  private readonly logger = new Logger(MilestoneService.name);

  constructor(
    private readonly contextPipeline: RoadmapContextService,
    private readonly aiService: AiService,
    private readonly languageService: UserLanguageService,
    private readonly supabaseService: SupabaseService,
    private readonly eventEmitter: EventEmitter2,
    private readonly weekStateService: WeekStateService,
  ) {}

  public async getCurrentMilestone(
    goalId: string,
    userId: string,
  ): Promise<CurrentWeekResponse> {
    return this.weekStateService.computeForGoal(goalId, userId);
  }

  public async activateNextMilestone(
    goalId: string,
    userId: string,
  ): Promise<Milestone> {
    const { isAllowed, nextUnlockDate } =
      await this.weekStateService.isActivationAllowed(goalId, userId);
    if (!isAllowed) {
      throw new ConflictException(
        `Next milestone unlocks on ${nextUnlockDate}`,
      );
    }

    const language = await this.languageService.getLanguage(userId);
    await this.summarizePreviousActiveMilestone(goalId, userId, language);
    await this.generateMonthlySummaryIfNeeded({ goalId, userId, language });

    const supabase = this.supabaseService.getAdminClient();
    const { data: nextRow, error } = await supabase
      .from("milestones")
      .select("*")
      .eq("goal_id", goalId)
      .is("starts_at", null)
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error !== null) {
      this.logger.error(
        `Failed to query next milestone for goal ${goalId}: ${error.message}`,
      );
      throw new NotFoundException("Failed to find next milestone");
    }
    if (nextRow === null) {
      throw new NotFoundException("No milestone to activate");
    }

    const lastActivated = await this.getLastActivatedMilestone(goalId, userId);
    const startsAt =
      this.weekStateService.computeStartsAtForNextMilestone(lastActivated);

    const generationContext = await this.buildGenerationContext(
      goalId,
      nextRow as Milestone,
    );

    const { generation_metadata: genMetadata, model } =
      await this.generateMilestoneContext(goalId, userId);

    const { data: updatedRow, error: updateError } = await supabase
      .from("milestones")
      .update({
        starts_at: startsAt,
        generation_context: generationContext as unknown as Json,
        generation_metadata: genMetadata as unknown as Json,
        model_used: model,
        is_fallback: false,
      })
      .eq("id", nextRow.id)
      .select()
      .single();

    if (updateError !== null) {
      this.logger.error(
        `Failed to activate milestone ${nextRow.id}: ${updateError.message}`,
      );
      throw new NotFoundException("Failed to activate milestone");
    }

    return this.mapMilestoneRow(updatedRow);
  }

  public async summarizeMilestone(
    milestoneId: string,
    goalId: string,
    userId: string,
    language: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: milestoneRow } = await supabase
      .from("milestones")
      .select("*")
      .eq("id", milestoneId)
      .eq("goal_id", goalId)
      .maybeSingle();
    if (milestoneRow === null) {
      return;
    }
    const milestone = this.mapMilestoneRow(milestoneRow);
    const weekData = await this.queryWeekDataForMilestone(milestone, goalId);
    const summary = await this.generateWeeklySummary(
      milestone,
      weekData,
      language,
    );

    const { error } = await supabase
      .from("milestones")
      .update({ summary: summary as unknown as Json })
      .eq("id", milestoneId);
    if (error !== null) {
      this.logger.warn(
        `Failed to persist summary for milestone ${milestoneId}: ${error.message}`,
      );
    }

    const contentText = formatSummaryForEmbedding(
      summary,
      milestone.order_index,
    );
    this.eventEmitter.emit("summary.generated", {
      planId: milestoneId,
      goalId,
      userId,
      summary,
      contentText,
    });
  }

  public async queryWeekDataForMilestone(
    milestone: Milestone,
    goalId: string,
  ): Promise<WeekData> {
    const supabase = this.supabaseService.getAdminClient();
    let tasksTotal = 0;
    const tasksCompleted = await this.queryTaskData(
      supabase,
      goalId,
      milestone.id,
      (total, completed) => {
        tasksTotal = total;
        return completed;
      },
    );
    const debriefNotes: string[] = [];
    await this.queryDebriefData(supabase, goalId, milestone.id, debriefNotes);
    return { tasksCompleted, tasksTotal, debriefNotes };
  }

  private async getLastActivatedMilestone(
    goalId: string,
    userId: string,
  ): Promise<Milestone | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from("milestones")
      .select("*, goals!inner(user_id)")
      .eq("goal_id", goalId)
      .eq("goals.user_id", userId)
      .not("starts_at", "is", null)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data === null) {
      return null;
    }
    return this.mapMilestoneRow(data);
  }

  private async buildGenerationContext(
    goalId: string,
    milestone: Milestone,
  ): Promise<GenerationContext> {
    const lastSummary = await this.getLastMilestoneSummary(goalId);
    const monthlyMs = milestone.monthly_summary;
    return {
      milestone_title: milestone.title,
      milestone_description: milestone.description,
      milestone_expected_outcome: milestone.expected_outcome,
      last_weekly_summary: lastSummary,
      last_monthly_summary:
        (monthlyMs as Record<string, unknown> | null) ?? null,
    };
  }

  private async getLastMilestoneSummary(
    goalId: string,
  ): Promise<WeeklySummary | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from("milestones")
      .select("summary")
      .eq("goal_id", goalId)
      .not("starts_at", "is", null)
      .not("summary", "is", null)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data?.summary as unknown as WeeklySummary | null) ?? null;
  }

  private async generateMilestoneContext(
    goalId: string,
    userId: string,
  ): Promise<{
    generation_metadata: Record<string, unknown>;
    model: string | null;
  }> {
    // Generation context is stored as JSONB — objectives are kept internally
    // but not stored as a separate DB column.
    // Return metadata from context assembly (no separate AI call needed for activation).
    try {
      await this.contextPipeline.assembleContext(goalId, userId);
      return {
        generation_metadata: {
          activated_at: new Date().toISOString(),
        },
        model: null,
      };
    } catch (error) {
      this.logger.warn(
        `Context assembly skipped for milestone activation: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { generation_metadata: {}, model: null };
    }
  }

  private async summarizePreviousActiveMilestone(
    goalId: string,
    userId: string,
    language: string,
  ): Promise<void> {
    // Find the last milestone that has starts_at set, is completed, but has no summary
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from("milestones")
      .select("*")
      .eq("goal_id", goalId)
      .not("completed_at", "is", null)
      .is("summary", null)
      .not("starts_at", "is", null)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data === null) {
      return;
    }

    const milestone = this.mapMilestoneRow(data);
    await this.summarizeMilestone(milestone.id, goalId, userId, language);
  }

  private async generateMonthlySummaryIfNeeded(params: {
    goalId: string;
    userId: string;
    language: string;
  }): Promise<void> {
    try {
      const milestones = await this.loadRecentCompletedMilestones(
        params.goalId,
      );
      if (
        milestones === null ||
        milestones.length < MONTHLY_SUMMARY_MIN_MILESTONES
      ) {
        return;
      }
      await this.checkAndGenerateMonthly({
        milestones,
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

  private async loadRecentCompletedMilestones(
    goalId: string,
  ): Promise<unknown[] | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from("milestones")
      .select("id, target_month, user_id:goals(user_id)")
      .eq("goal_id", goalId)
      .not("completed_at", "is", null)
      .order("order_index", { ascending: false })
      .limit(MONTHLY_SUMMARY_MIN_MILESTONES);
    return data;
  }

  private async checkAndGenerateMonthly(params: {
    milestones: unknown[];
    goalId: string;
    userId: string;
    language: string;
  }): Promise<void> {
    const current = params.milestones[0] as Record<string, unknown> as {
      id: string;
      target_month: number;
    };
    const previous = params.milestones[1] as Record<string, unknown> as {
      id: string;
      target_month: number;
    };
    if (current.target_month === previous.target_month) {
      return;
    }
    const supabase = this.supabaseService.getAdminClient();
    await this.storeMonthlySummary({
      supabase,
      milestone: previous,
      goalId: params.goalId,
      userId: params.userId,
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
    const summary = await this.loadMilestoneSummaryForMonth(
      params.supabase,
      params.milestone.id,
    );
    if (summary === null) {
      return;
    }
    const monthly = await this.generateMonthlySummaryFromWeekly(
      [summary],
      params.language,
    );
    await this.persistAndEmitMonthlySummary(params, monthly);
  }

  private async loadMilestoneSummaryForMonth(
    supabase: AdminClient,
    milestoneId: string,
  ): Promise<WeeklySummary | null> {
    const { data } = await supabase
      .from("milestones")
      .select("summary")
      .eq("id", milestoneId)
      .not("summary", "is", null)
      .maybeSingle();
    if (data === null) {
      return null;
    }
    return (data.summary as unknown as WeeklySummary | null) ?? null;
  }

  private async persistAndEmitMonthlySummary(
    params: MonthlyParams,
    monthlySummary: MonthlySummary,
  ): Promise<void> {
    const { error } = await params.supabase
      .from("milestones")
      .update({ monthly_summary: monthlySummary as unknown as Json })
      .eq("id", params.milestone.id);
    if (error !== null) {
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
    _milestone: Milestone,
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
      label: "Milestone summary",
    });

    return {
      completion_rate: completionRate,
      tasks_completed: weekData.tasksCompleted,
      tasks_total: weekData.tasksTotal || 1,
      debrief_count: weekData.debriefNotes.length,
      ...(narrative !== undefined ? { narrative } : {}),
    };
  }

  private async generateMonthlySummaryFromWeekly(
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
    milestoneId: string,
    callback: (total: number, completed: number) => number,
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("completed_at")
        .eq("goal_id", goalId)
        .eq("milestone_id", milestoneId);
      if (error !== null) {
        this.logger.debug(`tasks query skipped: ${error.message}`);
        return callback(0, 0);
      }
      if (data.length > 0) {
        const total = data.length;
        const completed = data.filter(
          (d: { completed_at: string | null }) => d.completed_at !== null,
        ).length;
        return callback(total, completed);
      }
    } catch (err) {
      this.logger.debug(
        `tasks query failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return callback(0, 0);
  }

  private async queryDebriefData(
    supabase: AdminClient,
    goalId: string,
    milestoneId: string,
    debriefNotes: string[],
  ): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("debriefs")
        .select("note")
        .eq("goal_id", goalId)
        .eq("milestone_id", milestoneId)
        .not("note", "is", null);
      if (error !== null) {
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

  private mapMilestoneRow(
    row: Database["public"]["Tables"]["milestones"]["Row"],
  ): Milestone {
    return {
      id: row.id,
      goal_id: row.goal_id,
      order_index: row.order_index,
      title: row.title,
      description: row.description,
      expected_outcome: row.expected_outcome,
      target_month: row.target_month,
      target_week: row.target_week,
      is_monthly_checkpoint: row.is_monthly_checkpoint,
      completed_at: row.completed_at,
      created_at: row.created_at ?? new Date().toISOString(),
      starts_at: row.starts_at,
      summary: row.summary as Milestone["summary"],
      monthly_summary: row.monthly_summary as Milestone["monthly_summary"],
      is_fallback: row.is_fallback,
      generation_context:
        (row.generation_context as Milestone["generation_context"] | null) ??
        {},
      generation_metadata:
        (row.generation_metadata as Record<string, unknown> | null) ?? {},
      model_used: row.model_used,
    };
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
  orderIndex: number,
): string {
  const lines = [
    `Milestone Summary (Milestone ${String(orderIndex)}):`,
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
