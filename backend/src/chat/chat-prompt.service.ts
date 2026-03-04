import { Injectable, Logger } from '@nestjs/common';

import { CoachService } from '../coach/coach.service.js';
import { config } from '../config/app.config.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { PromptInput } from './chat-prompt.builder.js';
import { buildCoachPrompt } from './chat-prompt.builder.js';

interface ActivePlan {
  week_number: number;
  focus: string;
  objectives: string[];
  milestone_id: string;
}

type GoalContext = PromptInput['goalContext'];

@Injectable()
export class ChatPromptService {
  private readonly logger = new Logger(ChatPromptService.name);

  constructor(
    private readonly coachService: CoachService,
    private readonly supabaseService: SupabaseService,
  ) {}

  public async getUserProfile(
    userId: string,
  ): Promise<{ coachId: number; language: string }> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('coach_id, language')
      .eq('id', userId)
      .single();

    if (error !== null) {
      this.logger.warn(`No profile for user ${userId}, using defaults`);
      return { coachId: config.coach.defaultCoachId, language: 'en' };
    }

    return {
      coachId: data.coach_id ?? config.coach.defaultCoachId,
      language: data.language ?? 'en',
    };
  }

  public async fetchGoalContext(
    goalId: string,
    userId: string,
  ): Promise<GoalContext> {
    const supabase = this.supabaseService.getAdminClient();
    const { goal, plan } = await this.fetchGoalAndPlan(
      supabase,
      goalId,
      userId,
    );
    const milestone =
      plan !== null
        ? await this.fetchMilestone(supabase, plan.milestone_id)
        : null;

    return {
      goal,
      milestone,
      weeklyPlan:
        plan !== null
          ? {
              week_number: plan.week_number,
              focus: plan.focus,
              objectives: plan.objectives,
            }
          : null,
    };
  }

  public async fetchMemory(userId: string, goalId: string): Promise<string> {
    const supabase = this.supabaseService.getAdminClient();

    const { data } = await supabase
      .from('coach_memories')
      .select('content')
      .eq('user_id', userId)
      .eq('goal_id', goalId)
      .single();

    return data?.content ?? '';
  }

  public async buildSystemPrompt(input: {
    coachId: number;
    goalContext: GoalContext;
    language: string;
    memory: string;
  }): Promise<string> {
    const coach = await this.coachService.getCoach(input.coachId);
    return buildCoachPrompt({
      coach,
      goalContext: input.goalContext,
      language: input.language,
      memory: input.memory,
    });
  }

  private async fetchGoalAndPlan(
    supabase: ReturnType<SupabaseService['getAdminClient']>,
    goalId: string,
    userId: string,
  ): Promise<{ goal: GoalContext['goal']; plan: ActivePlan | null }> {
    const [goalResult, planResult] = await Promise.all([
      supabase
        .from('goals')
        .select('title, description')
        .eq('id', goalId)
        .eq('user_id', userId)
        .single(),
      supabase
        .from('weekly_plans')
        .select('week_number, focus, objectives, milestone_id')
        .eq('goal_id', goalId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single(),
    ]);

    return {
      goal: goalResult.data as GoalContext['goal'],
      plan: planResult.data as ActivePlan | null,
    };
  }

  private async fetchMilestone(
    supabase: ReturnType<SupabaseService['getAdminClient']>,
    milestoneId: string,
  ): Promise<GoalContext['milestone']> {
    const { data } = await supabase
      .from('milestones')
      .select('title, description, expected_outcome, target_month')
      .eq('id', milestoneId)
      .single();

    return data as GoalContext['milestone'];
  }
}
