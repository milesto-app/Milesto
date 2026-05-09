import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import { UserLanguageService } from "../common/user-language.service.js";
import { IntakeProfileService } from "../intake/intake-profile.service.js";
import { IntakeReembedService } from "../intake/intake-reembed.service.js";
import type {
  ProfileResult,
  ReembedResult,
} from "../intake/types/intake.types.js";
import { RoadmapService } from "../roadmap/roadmap.service.js";
import type { Roadmap } from "../roadmap/types/roadmap.types.js";
import type { Database } from "../supabase/database.types.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import type {
  AdminGoalCoachMemory,
  AdminGoalDebrief,
  AdminGoalDetail,
  AdminGoalEmbedding,
  AdminGoalList,
  AdminGoalMilestone,
  AdminGoalRoadmap,
  AdminGoalSummary,
  AdminGoalWeeklyPlan,
  AdminGoalWeeklyTask,
  AdminIntakeBatch,
  AdminIntakeQuestion,
} from "./goals.types.js";

type GoalRow = Database["public"]["Tables"]["goals"]["Row"];
type IntakeBatchRow = Database["public"]["Tables"]["intake_batches"]["Row"];
type IntakeQuestionRow =
  Database["public"]["Tables"]["intake_questions"]["Row"];
type MilestoneRow = Database["public"]["Tables"]["milestones"]["Row"];
type WeeklyPlanRow = Database["public"]["Tables"]["weekly_plans"]["Row"];
type WeeklyTaskRow = Database["public"]["Tables"]["weekly_tasks"]["Row"];
type DebriefRow = Database["public"]["Tables"]["debriefs"]["Row"];
type CoachMemoryRow = Database["public"]["Tables"]["coach_memories"]["Row"];
type ContextEmbeddingRow =
  Database["public"]["Tables"]["context_embeddings"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

@Injectable()
export class GoalsService {
  private readonly logger = new Logger(GoalsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly intakeProfileService: IntakeProfileService,
    private readonly intakeReembedService: IntakeReembedService,
    private readonly roadmapService: RoadmapService,
    private readonly languageService: UserLanguageService,
  ) {}

  public async listGoals(
    page: number,
    perPage: number,
    status: string | undefined,
    userId: string | undefined,
  ): Promise<AdminGoalList> {
    const supabase = this.supabaseService.getAdminClient();
    const start = (page - 1) * perPage;
    const end = start + perPage - 1;

    let query = supabase
      .from("goals")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(start, end);

    if (status !== undefined) {
      query = query.eq("status", status);
    }
    if (userId !== undefined) {
      query = query.eq("user_id", userId);
    }

    const { data, count, error } = await query;
    if (error !== null) {
      this.logger.error(`Failed to list goals: ${error.message}`);
      throw new InternalServerErrorException("Failed to list goals");
    }

    const goals = await this.enrichGoalsWithUsers(data);
    const total = count ?? 0;
    return {
      goals,
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    };
  }

  public async getGoal(goalId: string): Promise<AdminGoalDetail> {
    const goal = await this.requireGoalById(goalId);
    return mapGoalDetail(goal);
  }

  public async getIntake(goalId: string): Promise<AdminIntakeBatch[]> {
    await this.requireGoalById(goalId);
    const supabase = this.supabaseService.getAdminClient();

    const [batchesRes, questionsRes] = await Promise.all([
      supabase
        .from("intake_batches")
        .select("*")
        .eq("goal_id", goalId)
        .order("batch_number", { ascending: true }),
      supabase
        .from("intake_questions")
        .select("*")
        .eq("goal_id", goalId)
        .order("batch_number", { ascending: true })
        .order("order_in_batch", { ascending: true }),
    ]);

    if (batchesRes.error !== null) {
      this.logger.error(
        `Failed to load intake batches for ${goalId}: ${batchesRes.error.message}`,
      );
      throw new InternalServerErrorException("Failed to load intake");
    }
    if (questionsRes.error !== null) {
      this.logger.error(
        `Failed to load intake questions for ${goalId}: ${questionsRes.error.message}`,
      );
      throw new InternalServerErrorException("Failed to load intake");
    }

    return groupBatchesWithQuestions(batchesRes.data, questionsRes.data);
  }

  public async getRoadmap(goalId: string): Promise<AdminGoalRoadmap> {
    const goal = await this.requireGoalById(goalId);
    const supabase = this.supabaseService.getAdminClient();

    const [milestonesRes, plansRes] = await Promise.all([
      supabase
        .from("milestones")
        .select("*")
        .eq("goal_id", goalId)
        .order("order_index", { ascending: true }),
      supabase
        .from("weekly_plans")
        .select("*")
        .eq("goal_id", goalId)
        .order("week_number", { ascending: true }),
    ]);

    if (milestonesRes.error !== null) {
      this.logger.error(
        `Failed to load milestones for ${goalId}: ${milestonesRes.error.message}`,
      );
      throw new InternalServerErrorException("Failed to load roadmap");
    }
    if (plansRes.error !== null) {
      this.logger.error(
        `Failed to load weekly plans for ${goalId}: ${plansRes.error.message}`,
      );
      throw new InternalServerErrorException("Failed to load roadmap");
    }

    return {
      status: goal.roadmap_status,
      modelUsed: goal.roadmap_model_used,
      generationAttempts: goal.roadmap_generation_attempts,
      createdAt: goal.roadmap_created_at,
      updatedAt: goal.roadmap_updated_at,
      milestones: milestonesRes.data.map(mapMilestone),
      weeklyPlans: plansRes.data.map(mapWeeklyPlan),
    };
  }

  public async getWeeklyTasks(
    goalId: string,
    weekIndex: number | undefined,
  ): Promise<AdminGoalWeeklyTask[]> {
    await this.requireGoalById(goalId);
    const supabase = this.supabaseService.getAdminClient();

    const planIdToWeek = await this.loadPlanWeekMap(goalId, weekIndex);
    if (planIdToWeek.size === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from("weekly_tasks")
      .select("*")
      .eq("goal_id", goalId)
      .in("weekly_plan_id", [...planIdToWeek.keys()])
      .order("order_index", { ascending: true });

    if (error !== null) {
      this.logger.error(
        `Failed to load weekly tasks for ${goalId}: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to load weekly tasks");
    }

    return data.map((row) =>
      mapWeeklyTask(row, planIdToWeek.get(row.weekly_plan_id) ?? 0),
    );
  }

  public async getDebriefs(goalId: string): Promise<AdminGoalDebrief[]> {
    await this.requireGoalById(goalId);
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("debriefs")
      .select("*")
      .eq("goal_id", goalId)
      .order("date", { ascending: false });

    if (error !== null) {
      this.logger.error(
        `Failed to load debriefs for ${goalId}: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to load debriefs");
    }

    return data.map(mapDebrief);
  }

  public async getCoachMemory(goalId: string): Promise<AdminGoalCoachMemory[]> {
    await this.requireGoalById(goalId);
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("coach_memories")
      .select("*")
      .eq("goal_id", goalId)
      .order("updated_at", { ascending: false });

    if (error !== null) {
      this.logger.error(
        `Failed to load coach memory for ${goalId}: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to load coach memory");
    }

    return data.map(mapCoachMemory);
  }

  public async getEmbeddings(
    goalId: string,
    limit: number,
  ): Promise<AdminGoalEmbedding[]> {
    await this.requireGoalById(goalId);
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("context_embeddings")
      .select("id, content_type, content_text, batch_id, metadata, created_at")
      .eq("goal_id", goalId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error !== null) {
      this.logger.error(
        `Failed to load embeddings for ${goalId}: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to load embeddings");
    }

    return data.map(mapEmbedding);
  }

  public async regenerateProfile(goalId: string): Promise<ProfileResult> {
    const goal = await this.requireGoalById(goalId);
    const language = await this.languageService.getLanguage(goal.user_id);
    return this.intakeProfileService.generateAndStoreProfile({
      userId: goal.user_id,
      goalId: goal.id,
      goalDescription: goal.description,
      language,
    });
  }

  public async regenerateRoadmap(goalId: string): Promise<Roadmap> {
    const goal = await this.requireGoalById(goalId);
    await this.resetRoadmapState(goal.id);
    return this.roadmapService.generateMilestones(goal.id, goal.user_id);
  }

  public async reembedGoal(goalId: string): Promise<ReembedResult> {
    await this.requireGoalById(goalId);
    return this.intakeReembedService.reembedGoal(goalId);
  }

  public async deleteGoal(goalId: string): Promise<void> {
    await this.requireGoalById(goalId);
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase.from("goals").delete().eq("id", goalId);
    if (error !== null) {
      this.logger.error(`Failed to delete goal ${goalId}: ${error.message}`);
      throw new InternalServerErrorException("Failed to delete goal");
    }
  }

  private async resetRoadmapState(goalId: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error: milestonesError } = await supabase
      .from("milestones")
      .delete()
      .eq("goal_id", goalId);
    if (milestonesError !== null) {
      this.logger.error(
        `Failed to clear milestones for ${goalId}: ${milestonesError.message}`,
      );
      throw new InternalServerErrorException("Failed to reset roadmap");
    }

    const { error: goalError } = await supabase
      .from("goals")
      .update({
        roadmap_status: null,
        roadmap_generation_attempts: 0,
        roadmap_model_used: null,
        roadmap_generation_metadata: null,
        roadmap_created_at: null,
        roadmap_updated_at: null,
      })
      .eq("id", goalId);
    if (goalError !== null) {
      this.logger.error(
        `Failed to reset roadmap fields for ${goalId}: ${goalError.message}`,
      );
      throw new InternalServerErrorException("Failed to reset roadmap");
    }
  }

  private async requireGoalById(goalId: string): Promise<GoalRow> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("id", goalId)
      .maybeSingle();

    if (error !== null) {
      this.logger.error(`Failed to load goal ${goalId}: ${error.message}`);
      throw new InternalServerErrorException("Failed to load goal");
    }
    if (data === null) {
      throw new NotFoundException(`Goal ${goalId} not found`);
    }
    return data;
  }

  private async loadPlanWeekMap(
    goalId: string,
    weekIndex: number | undefined,
  ): Promise<Map<string, number>> {
    const supabase = this.supabaseService.getAdminClient();
    let query = supabase
      .from("weekly_plans")
      .select("id, week_number")
      .eq("goal_id", goalId);

    if (weekIndex !== undefined) {
      query = query.eq("week_number", weekIndex);
    }

    const { data, error } = await query;
    if (error !== null) {
      this.logger.error(
        `Failed to load weekly plans for ${goalId}: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to load weekly plans");
    }

    const map = new Map<string, number>();
    for (const plan of data) {
      map.set(plan.id, plan.week_number);
    }
    return map;
  }

  private async enrichGoalsWithUsers(
    goals: GoalRow[],
  ): Promise<AdminGoalSummary[]> {
    if (goals.length === 0) {
      return [];
    }

    const userIds = [...new Set(goals.map((g) => g.user_id))];
    const profileMap = await this.loadProfiles(userIds);
    const emailMap = await this.loadUserEmails(userIds);

    return goals.map((goal) => {
      const profile = profileMap.get(goal.user_id);
      return {
        id: goal.id,
        userId: goal.user_id,
        userEmail: emailMap.get(goal.user_id) ?? null,
        userFirstName: profile?.first_name ?? null,
        userLastName: profile?.last_name ?? null,
        title: goal.title,
        status: goal.status,
        targetDate: goal.target_date,
        createdAt: goal.created_at,
        updatedAt: goal.updated_at,
      };
    });
  }

  private async loadProfiles(
    userIds: string[],
  ): Promise<Map<string, Pick<ProfileRow, "first_name" | "last_name">>> {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", userIds);

    const map = new Map<string, Pick<ProfileRow, "first_name" | "last_name">>();
    for (const row of data ?? []) {
      map.set(row.id, { first_name: row.first_name, last_name: row.last_name });
    }
    return map;
  }

  private async loadUserEmails(
    userIds: string[],
  ): Promise<Map<string, string>> {
    const supabase = this.supabaseService.getAdminClient();
    const map = new Map<string, string>();
    const results = await Promise.all(
      userIds.map(async (id) => supabase.auth.admin.getUserById(id)),
    );
    for (let i = 0; i < userIds.length; i += 1) {
      const id = userIds[i];
      const result = results[i];
      if (id === undefined || result === undefined || result.error !== null) {
        continue;
      }
      const email = result.data.user.email;
      if (email !== undefined) {
        map.set(id, email);
      }
    }
    return map;
  }
}

function mapGoalDetail(goal: GoalRow): AdminGoalDetail {
  return {
    id: goal.id,
    userId: goal.user_id,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    targetDate: goal.target_date,
    userMotivationQuote: goal.user_motivation_quote,
    narrativeSummary: goal.narrative_summary,
    profileData: goal.profile_data,
    profileCreatedAt: goal.profile_created_at,
    profileGenerationAttempts: goal.profile_generation_attempts,
    profileEmbedded: goal.profile_embedded,
    roadmapStatus: goal.roadmap_status,
    roadmapModelUsed: goal.roadmap_model_used,
    roadmapGenerationAttempts: goal.roadmap_generation_attempts,
    roadmapCreatedAt: goal.roadmap_created_at,
    roadmapUpdatedAt: goal.roadmap_updated_at,
    createdAt: goal.created_at,
    updatedAt: goal.updated_at,
    deletedAt: goal.deleted_at,
  };
}

function groupBatchesWithQuestions(
  batches: IntakeBatchRow[],
  questions: IntakeQuestionRow[],
): AdminIntakeBatch[] {
  const grouped = new Map<string, AdminIntakeQuestion[]>();
  for (const q of questions) {
    if (q.batch_id === null) {
      continue;
    }
    const list = grouped.get(q.batch_id) ?? [];
    list.push(mapIntakeQuestion(q));
    grouped.set(q.batch_id, list);
  }

  return batches.map((batch) => ({
    id: batch.id,
    batchNumber: batch.batch_number,
    isAnswered: batch.is_answered,
    embedded: batch.embedded,
    createdAt: batch.created_at,
    questions: grouped.get(batch.id) ?? [],
  }));
}

function mapIntakeQuestion(row: IntakeQuestionRow): AdminIntakeQuestion {
  return {
    id: row.id,
    questionText: row.question_text,
    questionType: row.question_type,
    config: row.config,
    orderInBatch: row.order_in_batch,
    answerText: row.answer_text,
    answerNumeric: row.answer_numeric,
    selectedOptions: row.selected_options,
    answeredAt: row.answered_at,
  };
}

function mapMilestone(row: MilestoneRow): AdminGoalMilestone {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    expectedOutcome: row.expected_outcome,
    orderIndex: row.order_index,
    targetMonth: row.target_month,
    targetWeek: row.target_week,
    isMonthlyCheckpoint: row.is_monthly_checkpoint,
    completedAt: row.completed_at,
  };
}

function mapWeeklyPlan(row: WeeklyPlanRow): AdminGoalWeeklyPlan {
  return {
    id: row.id,
    milestoneId: row.milestone_id,
    weekNumber: row.week_number,
    weekStartDate: row.week_start_date,
    expectedEndDate: row.expected_end_date,
    status: row.status,
    isFallback: row.is_fallback,
    modelUsed: row.model_used,
    objectives: row.objectives,
    summary: row.summary,
    createdAt: row.created_at,
  };
}

function mapWeeklyTask(
  row: WeeklyTaskRow,
  weekNumber: number,
): AdminGoalWeeklyTask {
  return {
    id: row.id,
    weeklyPlanId: row.weekly_plan_id,
    weekNumber,
    title: row.title,
    description: row.description,
    estimatedMinutes: row.estimated_minutes,
    orderIndex: row.order_index,
    isCompleted: row.is_completed,
    isFallback: row.is_fallback,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

function mapDebrief(row: DebriefRow): AdminGoalDebrief {
  return {
    id: row.id,
    weeklyPlanId: row.weekly_plan_id,
    date: row.date,
    note: row.note,
    createdAt: row.created_at,
  };
}

function mapCoachMemory(row: CoachMemoryRow): AdminGoalCoachMemory {
  return {
    id: row.id,
    content: row.content,
    updatedAt: row.updated_at,
  };
}

function mapEmbedding(
  row: Pick<
    ContextEmbeddingRow,
    | "id"
    | "content_type"
    | "content_text"
    | "batch_id"
    | "metadata"
    | "created_at"
  >,
): AdminGoalEmbedding {
  return {
    id: row.id,
    contentType: row.content_type,
    contentText: row.content_text,
    batchId: row.batch_id,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}
