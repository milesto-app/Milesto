import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { config } from "../config/app.config.js";
import type { Database, Json } from "../supabase/database.types.js";
import { SUPABASE_UNIQUE_VIOLATION } from "../supabase/error-codes.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import { ROADMAP_STATUS } from "./constants/roadmap.constants.js";
import type {
  GenerationMetadata,
  Milestone,
  MilestoneSummary,
  Roadmap,
} from "./types/roadmap.types.js";
import type { StorePlanRow, WeeklyPlan } from "./types/weekly-plan.types.js";
import type { WeeklyTask } from "./types/weekly-task.types.js";

type GoalUpdate = Database["public"]["Tables"]["goals"]["Update"];
type GoalRow = Database["public"]["Tables"]["goals"]["Row"];
type AdminClient = ReturnType<SupabaseService["getAdminClient"]>;

const WEEKS_PER_MONTH_GROUP = 4;
const STALE_GENERATION_MINUTES = 5;
const MS_PER_MINUTE = 60_000;
const STALE_GENERATION_MS = STALE_GENERATION_MINUTES * MS_PER_MINUTE;
const INITIAL_GENERATION_ATTEMPT = 1;
const SUNDAY_DAY = 0;
const SUNDAY_OFFSET = -6;
const MONDAY_OFFSET = 1;

type RoadmapLockRow = Pick<
  GoalRow,
  "id" | "roadmap_status" | "roadmap_generation_attempts" | "roadmap_updated_at"
>;

type GoalRoadmapColumns = Pick<
  GoalRow,
  | "id"
  | "user_id"
  | "roadmap_status"
  | "roadmap_generation_attempts"
  | "roadmap_model_used"
  | "roadmap_generation_metadata"
  | "roadmap_quality_scores"
  | "roadmap_created_at"
  | "roadmap_updated_at"
>;

interface StoreWeeklyTaskRow {
  title: string;
  description: string;
  order_index: number;
  estimated_minutes: number | null;
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
export class RoadmapDataService {
  private readonly logger = new Logger(RoadmapDataService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---------- Roadmap & milestones ----------

  public async getRoadmap(goalId: string, userId: string): Promise<Roadmap> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: goal, error } = await supabase
      .from("goals")
      .select(
        "id, user_id, roadmap_status, roadmap_generation_attempts, roadmap_model_used, roadmap_generation_metadata, roadmap_quality_scores, roadmap_created_at, roadmap_updated_at",
      )
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();
    if (error || goal.roadmap_status === null) {
      throw new NotFoundException("Roadmap not found");
    }
    const { data: milestones } = await supabase
      .from("milestones")
      .select("*")
      .eq("goal_id", goalId)
      .order("order_index", { ascending: true });
    const { data: activePlan } = await supabase
      .from("weekly_plans")
      .select("milestone_id")
      .eq("goal_id", goalId)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();
    return this.buildRoadmap({
      goal,
      milestones: milestones ?? [],
      currentMilestoneId: activePlan?.milestone_id ?? null,
    });
  }

  public async getMilestones(
    goalId: string,
    userId: string,
  ): Promise<MilestoneSummary[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: goal, error: goalError } = await supabase
      .from("goals")
      .select("id, roadmap_status")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();
    if (goalError || goal.roadmap_status === null) {
      throw new NotFoundException("Roadmap not found");
    }
    const { data, error } = await supabase
      .from("milestones")
      .select(
        "id, title, description, expected_outcome, is_monthly_checkpoint, order_index",
      )
      .eq("goal_id", goalId)
      .order("order_index", { ascending: true });
    if (error) {
      throw new NotFoundException("Milestones not found");
    }
    return data;
  }

  public async acquireGenerationLock(
    goalId: string,
    userId: string,
  ): Promise<Roadmap> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: existing } = await supabase
      .from("goals")
      .select(
        "id, roadmap_status, roadmap_generation_attempts, roadmap_updated_at",
      )
      .eq("id", goalId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (existing === null || existing === undefined) {
      throw new NotFoundException("Goal not found");
    }

    if (existing.roadmap_status === null) {
      return this.createNewRoadmap(supabase, goalId, userId);
    }

    return this.lockExistingRoadmap(supabase, existing, goalId, userId);
  }

  public async storeMilestones(
    goalId: string,
    milestones: Array<{
      title: string;
      description: string;
      expected_outcome: string;
      is_monthly_checkpoint?: boolean;
      order_index: number;
    }>,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const rows = milestones.map((m) => ({
      goal_id: goalId,
      title: m.title,
      description: m.description,
      expected_outcome: m.expected_outcome,
      target_month: Math.ceil(m.order_index / WEEKS_PER_MONTH_GROUP),
      target_week: m.order_index,
      is_monthly_checkpoint: false,
      order_index: m.order_index,
    }));
    const { error } = await supabase.from("milestones").insert(rows);
    if (error) {
      throw new InternalServerErrorException(
        `Failed to store milestones: ${error.message}`,
      );
    }
  }

  public async updateRoadmapStatus(
    goalId: string,
    status: string,
    metadata: GenerationMetadata | undefined,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const updateData: GoalUpdate = {
      roadmap_status: status,
      roadmap_updated_at: new Date().toISOString(),
    };
    if (metadata !== undefined) {
      updateData.roadmap_model_used = metadata.model_used;
      updateData.roadmap_generation_metadata = { ...metadata };
    }
    if (status === ROADMAP_STATUS.FAILED) {
      updateData.roadmap_generation_attempts = 0;
    }
    const { error } = await supabase
      .from("goals")
      .update(updateData)
      .eq("id", goalId);
    if (error) {
      this.logger.warn(
        `Failed to update roadmap ${goalId} status to ${status}: ${error.message}`,
      );
      if (status !== ROADMAP_STATUS.FAILED) {
        throw new InternalServerErrorException(
          `Failed to update roadmap status to ${status}: ${error.message}`,
        );
      }
    }
  }

  public async loadRoadmapAndMilestone(
    goalId: string,
    userId: string,
  ): Promise<{ roadmap: Roadmap; milestone: Milestone }> {
    const supabase = this.supabaseService.getAdminClient();
    const roadmap = await this.loadCompletedRoadmap(supabase, goalId, userId);
    const milestone = await this.loadActiveMilestone(supabase, roadmap, goalId);
    return { roadmap, milestone };
  }

  // ---------- Weekly plans ----------

  public async storeWeeklyPlan(row: StorePlanRow): Promise<WeeklyPlan> {
    const supabase = this.supabaseService.getAdminClient();
    const dbRow = {
      ...row,
      generation_context: row.generation_context as unknown as Json,
      generation_metadata: row.generation_metadata as unknown as Json,
    };
    const { data, error } = await supabase
      .from("weekly_plans")
      .upsert(dbRow, { onConflict: "goal_id,week_number" })
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
    this.eventEmitter.emit("weekly-plan.generated", { planId, goalId });
  }

  public getCurrentWeekStart(): string {
    const now = new Date();
    const day = now.getDay();
    const diff =
      now.getDate() -
      day +
      (day === SUNDAY_DAY ? SUNDAY_OFFSET : MONDAY_OFFSET);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split("T")[0] ?? "";
  }

  public async autoCompleteExpiredPlans(
    goalId: string,
    daysAgo: number,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    await supabase
      .from("weekly_plans")
      .update({ status: "completed" })
      .eq("goal_id", goalId)
      .eq("status", "active")
      .lt("week_start_date", cutoffDate.toISOString().split("T")[0] ?? "");
  }

  public async getLastCompletedPlanWithoutSummary(
    goalId: string,
  ): Promise<WeeklyPlan | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from("weekly_plans")
      .select("*")
      .eq("goal_id", goalId)
      .eq("status", "completed")
      .is("summary", null)
      .order("week_number", { ascending: false })
      .limit(1)
      .single();
    return (data as WeeklyPlan | null) ?? null;
  }

  public async calculateWeekNumber(goalId: string): Promise<number> {
    const supabase = this.supabaseService.getAdminClient();
    const { count } = await supabase
      .from("weekly_plans")
      .select("*", { count: "exact", head: true })
      .eq("goal_id", goalId);
    return (count ?? 0) + 1;
  }

  public async getCurrentWeeklyPlan(
    goalId: string,
    userId: string,
  ): Promise<WeeklyPlan | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("weekly_plans")
      .select("*")
      .eq("goal_id", goalId)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (error || data === null) {
      return null;
    }
    return data as WeeklyPlan;
  }

  public warnFallbackFailed(fallbackError: unknown): never {
    this.logger.warn(
      `Fallback plan creation also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
    );
    throw new InternalServerErrorException(
      "Weekly plan generation failed and fallback could not be stored",
    );
  }

  // ---------- Weekly tasks ----------

  public async getTasksForMilestone(
    milestoneId: string,
    userId: string,
  ): Promise<WeeklyTask[]> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select("id, goal_id")
      .eq("id", milestoneId)
      .maybeSingle();
    if (milestoneError !== null || milestone === null) {
      throw new NotFoundException("Milestone not found");
    }

    const { data: goal, error: goalError } = await supabase
      .from("goals")
      .select("id")
      .eq("id", milestone.goal_id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (goalError !== null || goal === null) {
      throw new NotFoundException("Milestone not found");
    }

    const { data: plans, error: plansError } = await supabase
      .from("weekly_plans")
      .select("id")
      .eq("milestone_id", milestoneId);
    if (plansError !== null) {
      throw new InternalServerErrorException("Failed to load milestone tasks");
    }
    const planIds = plans.map((p: { id: string }) => p.id);
    if (planIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from("weekly_tasks")
      .select("*")
      .in("weekly_plan_id", planIds)
      .order("order_index", { ascending: true });
    if (error) {
      throw new InternalServerErrorException("Failed to load milestone tasks");
    }
    return data as WeeklyTask[];
  }

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

  public async updateTask(
    params: UpdateTaskParams,
  ): Promise<{ task: WeeklyTask; didTransition: boolean }> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: transitioned, error: transitionError } = await supabase
      .from("weekly_tasks")
      .update({
        is_completed: params.isCompleted,
        completed_at: params.isCompleted ? new Date().toISOString() : null,
      })
      .eq("id", params.taskId)
      .eq("goal_id", params.goalId)
      .eq("user_id", params.userId)
      .eq("is_completed", !params.isCompleted)
      .select()
      .maybeSingle();

    if (transitionError !== null) {
      this.logger.error(
        `Failed to update weekly task: ${transitionError.message}`,
      );
      throw new InternalServerErrorException("Failed to update weekly task");
    }

    if (transitioned !== null) {
      return { task: transitioned as WeeklyTask, didTransition: true };
    }

    const { data: current, error: readError } = await supabase
      .from("weekly_tasks")
      .select("*")
      .eq("id", params.taskId)
      .eq("goal_id", params.goalId)
      .eq("user_id", params.userId)
      .maybeSingle();

    if (readError !== null || current === null) {
      throw new NotFoundException("Weekly task not found");
    }

    return { task: current as WeeklyTask, didTransition: false };
  }

  public async storeTasks(params: StoreTasksParams): Promise<WeeklyTask[]> {
    const supabase = this.supabaseService.getAdminClient();
    const rows = params.tasks.map((task) => ({
      weekly_plan_id: params.weeklyPlanId,
      goal_id: params.goalId,
      user_id: params.userId,
      title: task.title,
      description: task.description,
      estimated_minutes: task.estimated_minutes,
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

  // ---------- Private helpers ----------

  private async createNewRoadmap(
    supabase: AdminClient,
    goalId: string,
    userId: string,
  ): Promise<Roadmap> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("goals")
      .update({
        roadmap_status: ROADMAP_STATUS.GENERATING,
        roadmap_generation_attempts: INITIAL_GENERATION_ATTEMPT,
        roadmap_created_at: now,
        roadmap_updated_at: now,
      })
      .eq("id", goalId)
      .eq("user_id", userId)
      .select(
        "id, user_id, roadmap_status, roadmap_generation_attempts, roadmap_model_used, roadmap_generation_metadata, roadmap_quality_scores, roadmap_created_at, roadmap_updated_at",
      )
      .single();
    if (error) {
      throw new ConflictException("Failed to create roadmap");
    }
    return this.buildRoadmap({ goal: data });
  }

  private async lockExistingRoadmap(
    supabase: AdminClient,
    existing: RoadmapLockRow,
    goalId: string,
    userId: string,
  ): Promise<Roadmap> {
    if (existing.roadmap_status === ROADMAP_STATUS.COMPLETE) {
      throw new BadRequestException("Roadmap already generated");
    }
    if (existing.roadmap_status === ROADMAP_STATUS.GENERATING) {
      const updatedAtIso =
        existing.roadmap_updated_at ?? new Date(0).toISOString();
      const updatedAt = new Date(updatedAtIso).getTime();
      const isStale = Date.now() - updatedAt > STALE_GENERATION_MS;
      if (!isStale) {
        throw new ConflictException("Roadmap generation already in progress");
      }
      this.logger.warn(
        `Recovering stale generating lock for roadmap ${goalId}`,
      );
    }
    if (
      existing.roadmap_generation_attempts >=
      config.roadmap.maxGenerationAttempts
    ) {
      throw new BadRequestException("Maximum generation attempts exceeded");
    }
    const { data, error } = await supabase
      .from("goals")
      .update({
        roadmap_status: ROADMAP_STATUS.GENERATING,
        roadmap_generation_attempts: existing.roadmap_generation_attempts + 1,
        roadmap_updated_at: new Date().toISOString(),
      })
      .eq("id", goalId)
      .eq("user_id", userId)
      .neq("roadmap_status", ROADMAP_STATUS.GENERATING)
      .select(
        "id, user_id, roadmap_status, roadmap_generation_attempts, roadmap_model_used, roadmap_generation_metadata, roadmap_quality_scores, roadmap_created_at, roadmap_updated_at",
      )
      .single();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
    if (data === null || error) {
      throw new ConflictException("Roadmap generation already in progress");
    }
    return this.buildRoadmap({ goal: data });
  }

  private async loadCompletedRoadmap(
    supabase: AdminClient,
    goalId: string,
    userId: string,
  ): Promise<Roadmap> {
    const { data: goal, error } = await supabase
      .from("goals")
      .select(
        "id, user_id, roadmap_status, roadmap_generation_attempts, roadmap_model_used, roadmap_generation_metadata, roadmap_quality_scores, roadmap_created_at, roadmap_updated_at",
      )
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (error || goal === null || goal.roadmap_status === null) {
      throw new NotFoundException("No roadmap found for this goal");
    }
    if (goal.roadmap_status !== ROADMAP_STATUS.COMPLETE) {
      throw new BadRequestException("Goal has no completed roadmap");
    }
    return this.buildRoadmap({ goal });
  }

  private async loadActiveMilestone(
    supabase: AdminClient,
    roadmap: Roadmap,
    goalId: string,
  ): Promise<Milestone> {
    const milestones = await this.loadAllMilestones(supabase, goalId);
    if (milestones.length === 1) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return milestones[0]!;
    }

    const historyIndex = await this.getLastPlanMilestoneIndex(
      supabase,
      goalId,
      milestones,
    );
    const timeIndex = await this.getTimeBasedMilestoneIndex(
      supabase,
      roadmap,
      goalId,
      milestones.length,
    );

    const activeIndex = Math.max(historyIndex, timeIndex);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return milestones[activeIndex]!;
  }

  private async loadAllMilestones(
    supabase: AdminClient,
    goalId: string,
  ): Promise<Milestone[]> {
    const { data: milestones, error } = await supabase
      .from("milestones")
      .select("*")
      .eq("goal_id", goalId)
      .order("order_index", { ascending: true });
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (error || milestones === null || milestones.length === 0) {
      throw new NotFoundException("No milestones found for this roadmap");
    }
    return milestones as Milestone[];
  }

  private async getLastPlanMilestoneIndex(
    supabase: AdminClient,
    goalId: string,
    milestones: Milestone[],
  ): Promise<number> {
    const { data: lastPlan } = await supabase
      .from("weekly_plans")
      .select("milestone_id, status")
      .eq("goal_id", goalId)
      .order("week_number", { ascending: false })
      .limit(1)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (lastPlan === null || lastPlan === undefined) {
      return 0;
    }

    const index = milestones.findIndex((m) => m.id === lastPlan.milestone_id);
    if (index < 0) {
      return 0;
    }

    if (lastPlan.status === "completed") {
      return Math.min(index + 1, milestones.length - 1);
    }

    return index;
  }

  private async getTimeBasedMilestoneIndex(
    supabase: AdminClient,
    roadmap: Roadmap,
    goalId: string,
    milestoneCount: number,
  ): Promise<number> {
    const { data: goal } = await supabase
      .from("goals")
      .select("target_date")
      .eq("id", goalId)
      .single();

    if (
      goal?.target_date === null ||
      goal?.target_date === undefined ||
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      roadmap.created_at === null ||
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

  private buildRoadmap(params: {
    goal: GoalRoadmapColumns;
    milestones?: unknown[];
    currentMilestoneId?: string | null;
  }): Roadmap {
    const { goal, milestones, currentMilestoneId } = params;
    const now = new Date().toISOString();
    return {
      goal_id: goal.id,
      user_id: goal.user_id,
      status: (goal.roadmap_status ??
        ROADMAP_STATUS.GENERATING) as Roadmap["status"],
      generation_attempts: goal.roadmap_generation_attempts,
      model_used: goal.roadmap_model_used,
      generation_metadata:
        (goal.roadmap_generation_metadata as Record<string, unknown> | null) ??
        {},
      quality_scores:
        (goal.roadmap_quality_scores as Record<string, unknown> | null) ?? null,
      created_at: goal.roadmap_created_at ?? now,
      updated_at: goal.roadmap_updated_at ?? now,
      ...(milestones !== undefined
        ? { milestones: milestones as Milestone[] }
        : {}),
      ...(currentMilestoneId !== undefined
        ? { current_milestone_id: currentMilestoneId }
        : {}),
    };
  }
}
