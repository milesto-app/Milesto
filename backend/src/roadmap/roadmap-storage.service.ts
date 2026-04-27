import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import { config } from "../config/app.config.js";
import type { Database, Json } from "../supabase/database.types.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import { ROADMAP_STATUS } from "./constants/roadmap.constants.js";
import type {
  GenerationMetadata,
  Milestone,
  MilestoneSummary,
  Roadmap,
} from "./types/roadmap.types.js";

type GoalUpdate = Database["public"]["Tables"]["goals"]["Update"];
type GoalRow = Database["public"]["Tables"]["goals"]["Row"];

const WEEKS_PER_MONTH_GROUP = 4;
const STALE_GENERATION_MINUTES = 5;
const MS_PER_MINUTE = 60_000;
const STALE_GENERATION_MS = STALE_GENERATION_MINUTES * MS_PER_MINUTE;
const INITIAL_GENERATION_ATTEMPT = 1;

type RoadmapLockRow = Pick<
  GoalRow,
  "id" | "roadmap_status" | "roadmap_generation_attempts" | "roadmap_updated_at"
>;

@Injectable()
export class RoadmapStorageService {
  private readonly logger = new Logger(RoadmapStorageService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

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

  private async createNewRoadmap(
    supabase: ReturnType<SupabaseService["getAdminClient"]>,
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
    supabase: ReturnType<SupabaseService["getAdminClient"]>,
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

  private buildRoadmap(params: {
    goal: {
      id: string;
      user_id: string;
      roadmap_status: string | null;
      roadmap_generation_attempts: number;
      roadmap_model_used: string | null;
      roadmap_generation_metadata: Json | null;
      roadmap_quality_scores: Json | null;
      roadmap_created_at: string | null;
      roadmap_updated_at: string | null;
    };
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
