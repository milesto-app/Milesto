import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { ActivityService } from "../notifications/activity/activity.service.js";
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
    private readonly activity: ActivityService,
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
    this.activity
      .record(userId, "debrief_submitted")
      .catch((activityError: unknown) => {
        this.logger.warn(
          `Failed to record debrief_submitted activity: ${activityError instanceof Error ? activityError.message : String(activityError)}`,
        );
      });
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
    }
    return data as unknown as Debrief;
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
