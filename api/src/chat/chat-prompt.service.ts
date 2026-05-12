import { Injectable, Logger, NotFoundException } from "@nestjs/common";

import { COACH_BY_ID } from "../coach/coaches.config.js";
import { config } from "../config/app.config.js";
import { WeekStateService } from "../roadmap/week-state.service.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import type { PromptInput } from "./chat-prompt.builder.js";
import { buildCoachPrompt } from "./chat-prompt.builder.js";

type GoalContext = PromptInput["goalContext"];

@Injectable()
export class ChatPromptService {
  private readonly logger = new Logger(ChatPromptService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly weekStateService: WeekStateService,
  ) {}

  public async getUser(
    userId: string,
  ): Promise<{ coachId: number; language: string }> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from("users")
      .select("coach_id, language")
      .eq("id", userId)
      .single();

    if (error !== null) {
      this.logger.warn(`No user ${userId}, using defaults`);
      return { coachId: config.coach.defaultCoachId, language: "en" };
    }

    return {
      coachId: data.coach_id ?? config.coach.defaultCoachId,
      language: data.language ?? "en",
    };
  }

  public async fetchGoalContext(
    goalId: string,
    userId: string,
  ): Promise<GoalContext> {
    const supabase = this.supabaseService.getAdminClient();

    const [goalResult, weekStateResult] = await Promise.all([
      supabase
        .from("goals")
        .select("title, description")
        .eq("id", goalId)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .single(),
      this.weekStateService.computeForGoal(goalId, userId),
    ]);

    const activeMilestone = weekStateResult.milestone;

    return {
      goal: goalResult.data,
      milestone:
        activeMilestone !== null
          ? {
              title: activeMilestone.title,
              description: activeMilestone.description,
              expected_outcome: activeMilestone.expected_outcome,
              target_month: activeMilestone.target_month,
            }
          : null,
      weekState: {
        state: weekStateResult.week_state,
        next_week_starts_at: weekStateResult.next_week_starts_at,
        all_tasks_completed: weekStateResult.all_tasks_completed,
        has_debrief: weekStateResult.has_debrief,
      },
    };
  }

  public async fetchMemory(userId: string, goalId: string): Promise<string> {
    const supabase = this.supabaseService.getAdminClient();

    const { data } = await supabase
      .from("coach_memories")
      .select("content")
      .eq("user_id", userId)
      .eq("goal_id", goalId)
      .single();

    return data?.content ?? "";
  }

  public buildSystemPrompt(input: {
    coachId: number;
    goalContext: GoalContext;
    language: string;
    memory: string;
  }): string {
    const coach = COACH_BY_ID.get(input.coachId);
    if (coach === undefined) {
      throw new NotFoundException(
        `Coach with id ${String(input.coachId)} not found`,
      );
    }
    return buildCoachPrompt({
      coach,
      goalContext: input.goalContext,
      language: input.language,
      memory: input.memory,
    });
  }
}
