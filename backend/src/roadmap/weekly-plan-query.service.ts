import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { WeekData, WeeklyPlan } from './types/weekly-plan.types.js';

const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 86_400_000;

interface WeekDateRange {
  supabase: ReturnType<SupabaseService['getAdminClient']>;
  goalId: string;
  weekStart: string;
  weekEnd: string;
}

@Injectable()
export class WeeklyPlanQueryService {
  private readonly logger = new Logger(WeeklyPlanQueryService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async queryWeekData(plan: WeeklyPlan, goalId: string): Promise<WeekData> {
    const supabase = this.supabaseService.getAdminClient();
    const weekStart = plan.week_start_date;
    const weekEnd =
      new Date(new Date(weekStart).getTime() + DAYS_PER_WEEK * MS_PER_DAY)
        .toISOString()
        .split('T')[0] ?? '';
    const range: WeekDateRange = { supabase, goalId, weekStart, weekEnd };
    let objectivesTotal = 0;
    const objectivesCompleted = await this.queryObjectiveData(range, (total, completed) => {
      objectivesTotal = total;
      return completed;
    });
    const energyDistribution: Record<string, number> = {};
    await this.queryEnergyData(range, energyDistribution);
    const debriefNotes: string[] = [];
    await this.queryDebriefData(range, debriefNotes);
    return { objectivesCompleted, objectivesTotal, debriefNotes, energyDistribution };
  }

  private async queryObjectiveData(
    range: WeekDateRange,
    callback: (total: number, completed: number) => number,
  ): Promise<number> {
    try {
      const { data, error } = await range.supabase
        .from('daily_objectives')
        .select('is_completed')
        .eq('goal_id', range.goalId)
        .gte('date', range.weekStart)
        .lt('date', range.weekEnd);
      if (error) {
        this.logger.debug(`daily_objectives query skipped: ${error.message}`);
        return callback(0, 0);
      }
      if (data.length > 0) {
        const total = data.length;
        const completed = data.filter((d: { is_completed: boolean }) => d.is_completed).length;
        return callback(total, completed);
      }
    } catch (err) {
      this.logger.debug(
        `daily_objectives query failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return callback(0, 0);
  }

  private async queryEnergyData(
    range: WeekDateRange,
    energyDistribution: Record<string, number>,
  ): Promise<void> {
    try {
      const { data, error } = await range.supabase
        .from('check_ins')
        .select('energy_level')
        .eq('goal_id', range.goalId)
        .gte('date', range.weekStart)
        .lt('date', range.weekEnd);
      if (error) {
        this.logger.debug(`check_ins query skipped: ${error.message}`);
        return;
      }
      for (const row of data as Array<{ energy_level: string }>) {
        energyDistribution[row.energy_level] = (energyDistribution[row.energy_level] ?? 0) + 1;
      }
    } catch (err) {
      this.logger.debug(
        `check_ins query failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async queryDebriefData(range: WeekDateRange, debriefNotes: string[]): Promise<void> {
    try {
      const { data, error } = await range.supabase
        .from('debriefs')
        .select('note')
        .eq('goal_id', range.goalId)
        .gte('date', range.weekStart)
        .lt('date', range.weekEnd)
        .not('note', 'is', null);
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
