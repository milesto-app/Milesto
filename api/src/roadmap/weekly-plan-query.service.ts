import { Injectable, Logger } from "@nestjs/common";

import { SupabaseService } from "../supabase/supabase.service.js";
import type { WeekData, WeeklyPlan } from "./types/weekly-plan.types.js";

@Injectable()
export class WeeklyPlanQueryService {
  private readonly logger = new Logger(WeeklyPlanQueryService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

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
    return {
      tasksCompleted,
      tasksTotal,
      debriefNotes,
    };
  }

  private async queryTaskData(
    supabase: ReturnType<SupabaseService["getAdminClient"]>,
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
    supabase: ReturnType<SupabaseService["getAdminClient"]>,
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
