import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import type { Json } from "../supabase/database.types.js";
import { SUPABASE_UNIQUE_VIOLATION } from "../supabase/error-codes.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import type { SubmitDebriefDto } from "./dto/submit-debrief.dto.js";
import type { Debrief } from "./types/weekly-task.types.js";

@Injectable()
export class DebriefService {
  private readonly logger = new Logger(DebriefService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  public async submitDebrief(
    goalId: string,
    userId: string,
    dto: SubmitDebriefDto,
  ): Promise<Debrief> {
    await this.validateGoalExists(goalId, userId);
    await this.checkDuplicateDebrief(goalId, userId, dto.weekly_plan_id);
    const today = new Date().toISOString().split("T")[0] ?? "";
    return this.insertDebrief(goalId, userId, today, dto);
  }

  private async validateGoalExists(
    goalId: string,
    userId: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("goals")
      .select("id")
      .eq("id", goalId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (error || data === null) {
      throw new NotFoundException("Goal not found");
    }
  }

  private async checkDuplicateDebrief(
    goalId: string,
    userId: string,
    weeklyPlanId: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from("debriefs")
      .select("id")
      .eq("goal_id", goalId)
      .eq("user_id", userId)
      .eq("weekly_plan_id", weeklyPlanId)
      .limit(1);
    if (data !== null && data.length > 0) {
      throw new ConflictException(
        "Debrief already submitted for this weekly plan",
      );
    }
  }

  private async insertDebrief(
    goalId: string,
    userId: string,
    today: string,
    dto: SubmitDebriefDto,
  ): Promise<Debrief> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("debriefs")
      .insert({
        goal_id: goalId,
        user_id: userId,
        date: today,
        note: dto.note,
        task_ratings: (dto.task_ratings ?? []) as unknown as Json,
        weekly_plan_id: dto.weekly_plan_id,
      })
      .select()
      .single();
    if (error) {
      if (error.code === SUPABASE_UNIQUE_VIOLATION) {
        throw new ConflictException(
          "Debrief already submitted for this weekly plan",
        );
      }
      this.logger.error(`Failed to store debrief: ${error.message}`);
      throw new InternalServerErrorException("Failed to store debrief");
    }
    const didCompletePlan = await this.completeWeeklyPlan(dto.weekly_plan_id);
    this.eventEmitter.emit("debrief.submitted", {
      debriefId: (data as Record<string, unknown>).id,
      goalId,
      userId,
      weeklyPlanId: dto.weekly_plan_id,
      note: dto.note,
    });
    if (didCompletePlan) {
      this.eventEmitter.emit("weekly-plan.completed", {
        userId,
        goalId,
        planId: dto.weekly_plan_id,
      });
      await this.maybeCompleteMilestone(dto.weekly_plan_id, userId, goalId);
    }
    return data as unknown as Debrief;
  }

  private async maybeCompleteMilestone(
    weeklyPlanId: string,
    userId: string,
    goalId: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: plan, error: planErr } = await supabase
      .from("weekly_plans")
      .select("milestone_id")
      .eq("id", weeklyPlanId)
      .maybeSingle();
    if (planErr !== null) {
      this.logger.warn(
        `Milestone auto-completion: failed to read plan ${weeklyPlanId}: ${planErr.message}`,
      );
      return;
    }
    if (plan === null) {
      return;
    }

    const { count, error: siblingErr } = await supabase
      .from("weekly_plans")
      .select("id", { count: "exact", head: true })
      .eq("milestone_id", plan.milestone_id)
      .neq("status", "completed");
    if (siblingErr !== null) {
      this.logger.warn(
        `Milestone auto-completion: failed to count siblings for milestone ${plan.milestone_id}: ${siblingErr.message}`,
      );
      return;
    }
    if ((count ?? 0) > 0) {
      return;
    }

    const completedAt = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabase
      .from("milestones")
      .update({ completed_at: completedAt })
      .eq("id", plan.milestone_id)
      .is("completed_at", null)
      .select("id")
      .maybeSingle();
    if (updateErr !== null) {
      this.logger.warn(
        `Milestone auto-completion: failed to flip ${plan.milestone_id}: ${updateErr.message}`,
      );
      return;
    }
    if (updated === null) {
      return;
    }

    this.eventEmitter.emit("milestone.completed", {
      userId,
      milestoneId: plan.milestone_id,
      goalId,
      completedAt,
    });
    this.logger.log(
      `Auto-completed milestone ${plan.milestone_id} after final plan ${weeklyPlanId}`,
    );
  }

  private async completeWeeklyPlan(weeklyPlanId: string): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("weekly_plans")
      .update({ status: "completed" })
      .eq("id", weeklyPlanId)
      .eq("status", "active")
      .select("id");
    if (error) {
      this.logger.error(
        `Failed to complete weekly plan ${weeklyPlanId}: ${error.message}`,
      );
      return false;
    }
    return data.length > 0;
  }
}
