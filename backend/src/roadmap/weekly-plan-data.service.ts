import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import type { Json } from '../supabase/database.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { GenerationNarrativeService } from './generation-narrative.service.js';
import type {
  MonthlySummary,
  WeeklyPlan,
  WeeklySummary,
} from './types/weekly-plan.types.js';
import { WeeklyPlanQueryService } from './weekly-plan-query.service.js';

const MONTHLY_SUMMARY_MIN_PLANS = 2;

type SupabaseClient = ReturnType<SupabaseService['getAdminClient']>;
type MilestoneRef = { target_month: number; id: string };

interface SummaryParams {
  lastCompleted: WeeklyPlan;
  goalId: string;
  userId: string;
  formatFn: (summary: WeeklySummary, weekNumber: number) => string;
  language: string;
}

interface MonthlyParams {
  supabase: SupabaseClient;
  milestone: MilestoneRef;
  goalId: string;
  userId: string;
  formatFn: (summary: MonthlySummary, targetMonth: number) => string;
  language: string;
}

@Injectable()
export class WeeklyPlanDataService {
  private readonly logger = new Logger(WeeklyPlanDataService.name);

  // eslint-disable-next-line max-params
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly narrativeService: GenerationNarrativeService,
    private readonly eventEmitter: EventEmitter2,
    private readonly queryService: WeeklyPlanQueryService,
  ) {}

  public async generateAndStoreSummary(params: SummaryParams): Promise<void> {
    const weekData = await this.queryService.queryWeekData(
      params.lastCompleted,
      params.goalId,
    );
    const summary = await this.narrativeService.generateWeeklySummary(
      params.lastCompleted,
      weekData,
      params.language,
    );
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from('weekly_plans')
      .update({ summary: summary as unknown as Json })
      .eq('id', params.lastCompleted.id);
    if (error) {
      this.logger.warn(
        `Failed to persist weekly summary for plan ${params.lastCompleted.id}: ${error.message}`,
      );
    }
    const contentText = params.formatFn(
      summary,
      params.lastCompleted.week_number,
    );
    this.eventEmitter.emit('summary.generated', {
      planId: params.lastCompleted.id,
      goalId: params.goalId,
      userId: params.userId,
      summary,
      contentText,
    });
  }

  public async generateMonthlySummaryIfNeeded(params: {
    goalId: string;
    userId: string | undefined;
    formatFn: (summary: MonthlySummary, targetMonth: number) => string;
    language: string;
  }): Promise<void> {
    const { goalId, userId, formatFn, language } = params;
    try {
      const plans = await this.loadRecentCompletedPlans(goalId);
      if (plans === null || plans.length < MONTHLY_SUMMARY_MIN_PLANS) {
        return;
      }
      await this.checkAndGenerateMonthly({
        plans,
        goalId,
        userId,
        formatFn,
        language,
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
      .from('weekly_plans')
      .select('*, milestones!inner(target_month, id)')
      .eq('goal_id', goalId)
      .eq('status', 'completed')
      .order('week_number', { ascending: false })
      .limit(MONTHLY_SUMMARY_MIN_PLANS);
    return data;
  }
  private async checkAndGenerateMonthly(params: {
    plans: unknown[];
    goalId: string;
    userId: string | undefined;
    formatFn: (summary: MonthlySummary, targetMonth: number) => string;
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
      formatFn: params.formatFn,
      language: params.language,
    });
  }
  private async storeMonthlySummary(params: MonthlyParams): Promise<void> {
    const { data: row } = await params.supabase
      .from('milestones')
      .select('monthly_summary')
      .eq('id', params.milestone.id)
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
    const monthly = await this.narrativeService.generateMonthlySummary(
      summaries,
      params.language,
    );
    await this.persistAndEmitMonthlySummary(params, monthly);
  }

  private async loadWeeklySummaries(
    supabase: SupabaseClient,
    milestoneId: string,
  ): Promise<WeeklySummary[]> {
    const { data } = await supabase
      .from('weekly_plans')
      .select('summary')
      .eq('milestone_id', milestoneId)
      .eq('status', 'completed')
      .not('summary', 'is', null)
      .order('week_number', { ascending: true });
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
      .from('milestones')
      .update({ monthly_summary: monthlySummary as unknown as Json })
      .eq('id', params.milestone.id);
    if (error) {
      this.logger.warn(
        `Failed to store monthly summary on milestone ${params.milestone.id}: ${error.message}`,
      );
      return;
    }
    const contentText = params.formatFn(
      monthlySummary,
      params.milestone.target_month,
    );
    this.eventEmitter.emit('summary.generated', {
      planId: params.milestone.id,
      goalId: params.goalId,
      userId: params.userId,
      summary: monthlySummary,
      contentText,
    });
  }
}
