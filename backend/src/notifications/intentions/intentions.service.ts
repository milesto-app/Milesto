import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import type { Database } from "../../supabase/database.types.js";
import { SupabaseService } from "../../supabase/supabase.service.js";
import type { UpdateIntentionDto } from "./dto/update-intention.dto.js";
import type { UpsertIntentionDto } from "./dto/upsert-intention.dto.js";

type IntentionRow =
  Database["public"]["Tables"]["weekly_task_intentions"]["Row"];

@Injectable()
export class IntentionsService {
  private readonly logger = new Logger(IntentionsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async upsert(
    userId: string,
    input: UpsertIntentionDto,
  ): Promise<IntentionRow> {
    await this.assertTaskOwnership(userId, input.task_id);
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("weekly_task_intentions")
      .upsert(
        {
          task_id: input.task_id,
          day_of_week: input.day_of_week,
          local_hour: input.local_hour,
          location_label: input.location_label ?? null,
          captured_at: new Date().toISOString(),
        },
        { onConflict: "task_id" },
      )
      .select()
      .single();
    if (error !== null) {
      this.logger.error(
        `Failed to upsert intention for task ${input.task_id}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        `Failed to save intention: ${error.message}`,
      );
    }
    await this.cancelPendingJobsForTask(input.task_id, data.captured_at);
    return data;
  }

  public async getForTask(
    userId: string,
    taskId: string,
  ): Promise<IntentionRow | null> {
    await this.assertTaskOwnership(userId, taskId);
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("weekly_task_intentions")
      .select()
      .eq("task_id", taskId)
      .maybeSingle();
    if (error !== null) {
      this.logger.error(
        `Failed to load intention for task ${taskId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        `Failed to load intention: ${error.message}`,
      );
    }
    return data;
  }

  public async update(
    userId: string,
    taskId: string,
    input: UpdateIntentionDto,
  ): Promise<IntentionRow> {
    await this.assertTaskOwnership(userId, taskId);
    const patch: Partial<IntentionRow> = {};
    if (input.day_of_week !== undefined) {
      patch.day_of_week = input.day_of_week;
    }
    if (input.local_hour !== undefined) {
      patch.local_hour = input.local_hour;
    }
    if (input.location_label !== undefined) {
      patch.location_label = input.location_label;
    }
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("weekly_task_intentions")
      .update(patch)
      .eq("task_id", taskId)
      .select()
      .maybeSingle();
    if (error !== null) {
      this.logger.error(
        `Failed to update intention for task ${taskId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        `Failed to update intention: ${error.message}`,
      );
    }
    if (data === null) {
      throw new NotFoundException("Intention not found");
    }
    await this.cancelPendingJobsForTask(taskId, data.captured_at);
    return data;
  }

  public async delete(userId: string, taskId: string): Promise<void> {
    await this.assertTaskOwnership(userId, taskId);
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("weekly_task_intentions")
      .delete()
      .eq("task_id", taskId);
    if (error !== null) {
      this.logger.error(
        `Failed to delete intention for task ${taskId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        `Failed to delete intention: ${error.message}`,
      );
    }
    await this.cancelPendingJobsForTask(taskId, new Date().toISOString());
  }

  private async cancelPendingJobsForTask(
    taskId: string,
    capturedAt: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase.rpc(
      "cancel_pending_intention_jobs",
      { p_task_id: taskId, p_captured_at: capturedAt },
    );
    if (error !== null) {
      this.logger.warn(
        `Failed to cancel pending intention jobs for task ${taskId} (captured_at=${capturedAt}): ${error.message}`,
      );
      return;
    }
    if (data > 0) {
      this.logger.log(
        `Cancelled ${String(data)} pending implementation_intention jobs for task ${taskId} (captured_at=${capturedAt})`,
      );
    }
  }

  private async assertTaskOwnership(
    userId: string,
    taskId: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("weekly_tasks")
      .select("user_id")
      .eq("id", taskId)
      .maybeSingle();
    if (error !== null) {
      this.logger.error(
        `Failed to verify task ownership for ${taskId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        `Failed to verify task ownership: ${error.message}`,
      );
    }
    if (data === null) {
      throw new NotFoundException("Task not found");
    }
    if (data.user_id !== userId) {
      throw new ForbiddenException("You do not own this task");
    }
  }
}
