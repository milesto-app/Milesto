import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import type { Json } from '../supabase/database.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { Milestone, Roadmap } from './types/roadmap.types.js';
import type { StorePlanRow, WeeklyPlan } from './types/weekly-plan.types.js';

export type { StorePlanRow } from './types/weekly-plan.types.js';

const SUNDAY_DAY = 0;
const SUNDAY_OFFSET = -6;
const MONDAY_OFFSET = 1;

@Injectable()
export class WeeklyPlanStorageService {
  private readonly logger = new Logger(WeeklyPlanStorageService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  public async storeWeeklyPlan(row: StorePlanRow): Promise<WeeklyPlan> {
    const supabase = this.supabaseService.getAdminClient();
    const dbRow = {
      ...row,
      generation_context: row.generation_context as unknown as Json,
      generation_metadata: row.generation_metadata as unknown as Json,
    };
    const { data, error } = await supabase
      .from('weekly_plans')
      .upsert(dbRow, { onConflict: 'roadmap_id,week_number' })
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(
        `Failed to store weekly plan: ${error.message}`,
      );
    }
    return data as WeeklyPlan;
  }

  public emitPlanGenerated(planId: string, goalId: string): void {
    this.eventEmitter.emit('weekly-plan.generated', { planId, goalId });
  }

  public getCurrentWeekStart(): string {
    const now = new Date();
    const day = now.getDay();
    const diff =
      now.getDate() -
      day +
      (day === SUNDAY_DAY ? SUNDAY_OFFSET : MONDAY_OFFSET);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0] ?? '';
  }

  public async autoCompleteExpiredPlans(
    goalId: string,
    daysAgo: number,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    await supabase
      .from('weekly_plans')
      .update({ status: 'completed' })
      .eq('goal_id', goalId)
      .eq('status', 'active')
      .lt('week_start_date', cutoffDate.toISOString().split('T')[0] ?? '');
  }

  public async getLastCompletedPlanWithoutSummary(
    goalId: string,
  ): Promise<WeeklyPlan | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('goal_id', goalId)
      .eq('status', 'completed')
      .is('summary', null)
      .order('week_number', { ascending: false })
      .limit(1)
      .single();
    return (data as WeeklyPlan | null) ?? null;
  }

  public async calculateWeekNumber(roadmapId: string): Promise<number> {
    const supabase = this.supabaseService.getAdminClient();
    const { count } = await supabase
      .from('weekly_plans')
      .select('*', { count: 'exact', head: true })
      .eq('roadmap_id', roadmapId);
    return (count ?? 0) + 1;
  }

  public async getCurrentWeeklyPlan(
    goalId: string,
    userId: string,
  ): Promise<WeeklyPlan | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (error || data === null) {
      return null;
    }
    return data as WeeklyPlan;
  }

  public async loadRoadmapAndMilestone(
    goalId: string,
    userId: string,
  ): Promise<{ roadmap: Roadmap; milestone: Milestone }> {
    const supabase = this.supabaseService.getAdminClient();
    const roadmap = await this.loadRoadmap(supabase, goalId, userId);
    const milestone = await this.loadActiveMilestone(supabase, roadmap, goalId);
    return { roadmap, milestone };
  }

  public warnFallbackFailed(fallbackError: unknown): never {
    this.logger.warn(
      `Fallback plan creation also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
    );
    throw new InternalServerErrorException(
      'Weekly plan generation failed and fallback could not be stored',
    );
  }

  private async loadRoadmap(
    supabase: ReturnType<SupabaseService['getAdminClient']>,
    goalId: string,
    userId: string,
  ): Promise<Roadmap> {
    const { data: roadmap, error } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (error || roadmap === null) {
      throw new NotFoundException('No roadmap found for this goal');
    }
    if (roadmap.status !== 'complete') {
      throw new BadRequestException('Goal has no completed roadmap');
    }
    return roadmap as Roadmap;
  }

  private async loadActiveMilestone(
    supabase: ReturnType<SupabaseService['getAdminClient']>,
    roadmap: Roadmap,
    goalId: string,
  ): Promise<Milestone> {
    const milestones = await this.loadAllMilestones(supabase, roadmap.id);
    if (milestones.length === 1) {
      return milestones[0]!;
    }

    const historyIndex = await this.getLastPlanMilestoneIndex(
      supabase,
      roadmap.id,
      milestones,
    );
    const timeIndex = await this.getTimeBasedMilestoneIndex(
      supabase,
      roadmap,
      goalId,
      milestones.length,
    );

    const activeIndex = Math.max(historyIndex, timeIndex);
    return milestones[activeIndex]!;
  }

  private async loadAllMilestones(
    supabase: ReturnType<SupabaseService['getAdminClient']>,
    roadmapId: string,
  ): Promise<Milestone[]> {
    const { data: milestones, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('roadmap_id', roadmapId)
      .order('order_index', { ascending: true });
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (error || milestones === null || milestones.length === 0) {
      throw new NotFoundException('No milestones found for this roadmap');
    }
    return milestones as Milestone[];
  }

  private async getLastPlanMilestoneIndex(
    supabase: ReturnType<SupabaseService['getAdminClient']>,
    roadmapId: string,
    milestones: Milestone[],
  ): Promise<number> {
    const { data: lastPlan } = await supabase
      .from('weekly_plans')
      .select('milestone_id')
      .eq('roadmap_id', roadmapId)
      .order('week_number', { ascending: false })
      .limit(1)
      .single();

    if (lastPlan === null || lastPlan === undefined) {
      return 0;
    }

    const index = milestones.findIndex((m) => m.id === lastPlan.milestone_id);
    return index >= 0 ? index : 0;
  }

  private async getTimeBasedMilestoneIndex(
    supabase: ReturnType<SupabaseService['getAdminClient']>,
    roadmap: Roadmap,
    goalId: string,
    milestoneCount: number,
  ): Promise<number> {
    const { data: goal } = await supabase
      .from('goals')
      .select('target_date')
      .eq('id', goalId)
      .single();

    if (
      goal?.target_date === null ||
      goal?.target_date === undefined ||
      roadmap.created_at === null ||
      roadmap.created_at === undefined
    ) {
      return 0;
    }

    const start = new Date(roadmap.created_at).getTime();
    const end = new Date(goal.target_date).getTime();

    if (end <= start) {
      return 0;
    }

    const now = Date.now();
    const progress = Math.max(0, Math.min(1, (now - start) / (end - start)));
    return Math.min(milestoneCount - 1, Math.floor(progress * milestoneCount));
  }
}
