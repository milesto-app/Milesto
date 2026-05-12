import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import type { SubmitDebriefDto } from "../roadmap/dto/submit-debrief.dto.js";
import type { Debrief } from "../roadmap/types/task.types.js";
import { SUPABASE_UNIQUE_VIOLATION } from "../supabase/error-codes.js";
import { SupabaseService } from "../supabase/supabase.service.js";

@Injectable()
export class DebriefService {
  private readonly logger = new Logger(DebriefService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async submitDebrief(
    goalId: string,
    userId: string,
    dto: SubmitDebriefDto,
  ): Promise<Debrief> {
    await this.validateGoalExists(goalId, userId);
    await this.validateMilestone(goalId, dto.milestone_id);
    await this.checkDuplicateDebrief(goalId, userId, dto.milestone_id);
    const today = new Date().toISOString().split("T")[0] ?? "";
    return this.insertDebrief(goalId, userId, today, dto);
  }

  public async getHistory(goalId: string, userId: string): Promise<Debrief[]> {
    await this.validateGoalExists(goalId, userId);
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("debriefs")
      .select("*")
      .eq("goal_id", goalId)
      .eq("user_id", userId)
      .order("date", { ascending: false });
    if (error) {
      this.logger.error(`Failed to fetch debrief history: ${error.message}`);
      throw new InternalServerErrorException("Failed to fetch debrief history");
    }
    return data as unknown as Debrief[];
  }

  private async validateMilestone(
    goalId: string,
    milestoneId: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("milestones")
      .select("id")
      .eq("id", milestoneId)
      .eq("goal_id", goalId)
      .maybeSingle();

    if (error !== null) {
      this.logger.error(
        `Failed to validate milestone ${milestoneId}: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to validate milestone");
    }
    if (data === null) {
      throw new NotFoundException("Milestone not found");
    }
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
    milestoneId: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from("debriefs")
      .select("id")
      .eq("goal_id", goalId)
      .eq("user_id", userId)
      .eq("milestone_id", milestoneId)
      .limit(1);
    if (data !== null && data.length > 0) {
      throw new ConflictException(
        "Debrief already submitted for this milestone",
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
        milestone_id: dto.milestone_id,
      })
      .select()
      .single();
    if (error) {
      if (error.code === SUPABASE_UNIQUE_VIOLATION) {
        throw new ConflictException(
          "Debrief already submitted for this milestone",
        );
      }
      this.logger.error(`Failed to store debrief: ${error.message}`);
      throw new InternalServerErrorException("Failed to store debrief");
    }
    await this.completeMilestone(dto.milestone_id, userId, goalId);
    return data as unknown as Debrief;
  }

  private async completeMilestone(
    milestoneId: string,
    _userId: string,
    goalId: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const completedAt = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabase
      .from("milestones")
      .update({ completed_at: completedAt })
      .eq("id", milestoneId)
      .eq("goal_id", goalId)
      .is("completed_at", null)
      .select("id")
      .maybeSingle();
    if (updateErr !== null) {
      this.logger.warn(
        `Milestone auto-completion: failed to flip ${milestoneId}: ${updateErr.message}`,
      );
      return;
    }
    if (updated !== null) {
      this.logger.log(
        `Auto-completed milestone ${milestoneId} after debrief for goal ${goalId}`,
      );
    }
  }
}
