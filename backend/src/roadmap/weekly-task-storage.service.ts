import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import { SUPABASE_UNIQUE_VIOLATION } from "../supabase/error-codes.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import type { WeeklyTask } from "./types/weekly-task.types.js";

interface StoreWeeklyTaskRow {
  title: string;
  description: string;
  order_index: number;
  difficulty_rating: string | null;
}

export interface StoreTasksParams {
  tasks: StoreWeeklyTaskRow[];
  weeklyPlanId: string;
  goalId: string;
  userId: string;
  isFallback: boolean;
}

export interface UpdateTaskParams {
  taskId: string;
  goalId: string;
  userId: string;
  isCompleted: boolean;
}

@Injectable()
export class WeeklyTaskStorageService {
  private readonly logger = new Logger(WeeklyTaskStorageService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async getExistingTasks(
    goalId: string,
    userId: string,
    weeklyPlanId: string,
  ): Promise<WeeklyTask[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("weekly_tasks")
      .select("*")
      .eq("goal_id", goalId)
      .eq("user_id", userId)
      .eq("weekly_plan_id", weeklyPlanId)
      .order("order_index", { ascending: true });

    if (error) {
      this.logger.error(
        `Failed to query existing weekly tasks: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to retrieve weekly tasks");
    }

    return data as WeeklyTask[];
  }

  public async updateTask(params: UpdateTaskParams): Promise<WeeklyTask> {
    const supabase = this.supabaseService.getAdminClient();

    const { error: findError } = await supabase
      .from("weekly_tasks")
      .select("id")
      .eq("id", params.taskId)
      .eq("goal_id", params.goalId)
      .eq("user_id", params.userId)
      .single();

    if (findError !== null) {
      throw new NotFoundException("Weekly task not found");
    }

    const { data, error } = await supabase
      .from("weekly_tasks")
      .update({ is_completed: params.isCompleted })
      .eq("id", params.taskId)
      .eq("goal_id", params.goalId)
      .eq("user_id", params.userId)
      .select()
      .single();

    if (error !== null) {
      this.logger.error(`Failed to update weekly task: ${error.message}`);
      throw new InternalServerErrorException("Failed to update weekly task");
    }

    return data as WeeklyTask;
  }

  public async storeTasks(params: StoreTasksParams): Promise<WeeklyTask[]> {
    const supabase = this.supabaseService.getAdminClient();
    const rows = params.tasks.map((task) => ({
      weekly_plan_id: params.weeklyPlanId,
      goal_id: params.goalId,
      user_id: params.userId,
      title: task.title,
      description: task.description,
      difficulty_rating: task.difficulty_rating,
      order_index: task.order_index,
      is_completed: false,
      is_fallback: params.isFallback,
    }));

    const { data, error } = await supabase
      .from("weekly_tasks")
      .insert(rows)
      .select()
      .order("order_index", { ascending: true });

    if (error === null) {
      return data as WeeklyTask[];
    }

    if (error.code === SUPABASE_UNIQUE_VIOLATION) {
      this.logger.warn(
        `Concurrent weekly tasks insert for plan ${params.weeklyPlanId}; returning existing`,
      );
      return this.getExistingTasks(
        params.goalId,
        params.userId,
        params.weeklyPlanId,
      );
    }

    this.logger.error(`Failed to store weekly tasks: ${error.message}`);
    throw new InternalServerErrorException("Failed to store weekly tasks");
  }

  public async getWeeklyCompletionRate(
    goalId: string,
    userId: string,
    weeklyPlanId: string,
  ): Promise<{ completed: number; total: number; rate: number }> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("weekly_tasks")
      .select("is_completed")
      .eq("weekly_plan_id", weeklyPlanId)
      .eq("goal_id", goalId)
      .eq("user_id", userId);

    if (error) {
      this.logger.error(
        `Failed to query weekly completion rate: ${error.message}`,
      );
      throw new InternalServerErrorException(
        "Failed to query weekly completion rate",
      );
    }

    const total = data.length;
    const completed = data.filter(
      (d: { is_completed: boolean }) => d.is_completed,
    ).length;
    const rate = total === 0 ? 0 : completed / total;

    return { completed, total, rate };
  }
}
