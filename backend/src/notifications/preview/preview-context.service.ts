import { Injectable, Logger } from "@nestjs/common";

import { COACH_BY_ID } from "../../coach/coaches.config.js";
import { SupabaseService } from "../../supabase/supabase.service.js";
import type { SupportedLanguage } from "../copy/fallbacks.js";
import {
  dailyCheckInStub,
  goalHitStub,
  milestoneHitStub,
  milestonePreviewStub,
  resolveLanguage,
  streakAtRiskStub,
  streakBrokenStub,
  streakMilestoneStub,
  weekCompletedStub,
} from "../copy/fallbacks.js";
import { NOTIFICATION_KIND } from "../outbox/outbox.types.js";

const DEFAULT_STO_HOUR = 18;
const DAY_LABELS: readonly string[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const FALLBACK_GOAL_TITLE_EN = "your goal";
const FALLBACK_MILESTONE_TITLE_EN = "your next milestone";
const FALLBACK_TASK_TITLE_EN = "your next task";
const FALLBACK_OPEN_TASK_EN = "your open task";

export interface PreviewContextInput {
  readonly userId: string;
  readonly kind: string;
  readonly languageOverride?: SupportedLanguage;
  readonly coachIdOverride?: number;
}

export interface PreviewContextOutput {
  readonly language: SupportedLanguage;
  readonly coachId: number | null;
  readonly stubTitle: string;
  readonly stubTeaser: string;
  readonly memoryHooks: Record<string, unknown>;
  readonly kindSpecific: Record<string, unknown>;
  readonly suppressStreakCopy: boolean;
}

interface ProfileRow {
  readonly coach_id: number | null;
  readonly language: string | null;
  readonly timezone: string | null;
  readonly sto_active_hour: number | null;
  readonly first_name: string | null;
}

interface GoalRow {
  readonly id: string;
  readonly title: string;
  readonly target_date: string | null;
}

interface MilestoneRow {
  readonly id: string;
  readonly title: string;
  readonly order_index: number;
  readonly completed_at: string | null;
}

interface TaskRow {
  readonly title: string;
  readonly is_completed: boolean;
}

interface StreakRow {
  readonly current_weeks: number;
}

interface KindContext {
  readonly profile: ProfileRow | null;
  readonly goal: GoalRow | null;
  readonly milestones: readonly MilestoneRow[];
  readonly activeMilestone: MilestoneRow | null;
  readonly lastCompletedMilestone: MilestoneRow | null;
  readonly nextTask: TaskRow | null;
  readonly streak: StreakRow | null;
}

type KindSpecificBuilder = (ctx: KindContext) => Record<string, unknown>;

const KIND_SPECIFIC_BUILDERS: Readonly<Record<string, KindSpecificBuilder>> = {
  [NOTIFICATION_KIND.DAILY_CHECK_IN]: (ctx) => ({
    target_local_hour: ctx.profile?.sto_active_hour ?? DEFAULT_STO_HOUR,
    timezone: ctx.profile?.timezone ?? "UTC",
  }),
  [NOTIFICATION_KIND.IMPLEMENTATION_INTENTION]: (ctx) => ({
    task_title: ctx.nextTask?.title ?? FALLBACK_TASK_TITLE_EN,
    day_of_week: DAY_LABELS[new Date().getUTCDay()],
    local_hour: ctx.profile?.sto_active_hour ?? DEFAULT_STO_HOUR,
  }),
  [NOTIFICATION_KIND.MILESTONE_HIT]: (ctx) => ({
    milestone_title:
      ctx.lastCompletedMilestone?.title ??
      ctx.activeMilestone?.title ??
      FALLBACK_MILESTONE_TITLE_EN,
    goal_title: ctx.goal?.title ?? FALLBACK_GOAL_TITLE_EN,
  }),
  [NOTIFICATION_KIND.MILESTONE_PREVIEW]: (ctx) => ({
    milestone_title: ctx.activeMilestone?.title ?? FALLBACK_MILESTONE_TITLE_EN,
    goal_title: ctx.goal?.title ?? FALLBACK_GOAL_TITLE_EN,
  }),
  [NOTIFICATION_KIND.GOAL_HIT]: (ctx) => ({
    goal_title: ctx.goal?.title ?? FALLBACK_GOAL_TITLE_EN,
    target_date: ctx.goal?.target_date ?? null,
  }),
  [NOTIFICATION_KIND.GOAL_DEADLINE_COUNTDOWN]: (ctx) => ({
    goal_title: ctx.goal?.title ?? FALLBACK_GOAL_TITLE_EN,
    target_date: ctx.goal?.target_date ?? null,
  }),
  [NOTIFICATION_KIND.WEEK_COMPLETED]: (ctx) => ({
    goal_title: ctx.goal?.title ?? FALLBACK_GOAL_TITLE_EN,
  }),
  [NOTIFICATION_KIND.STREAK_AT_RISK]: (ctx) => ({
    current_streak_weeks: ctx.streak?.current_weeks ?? 0,
  }),
  [NOTIFICATION_KIND.STREAK_BROKEN]: (ctx) => ({
    current_streak_weeks: ctx.streak?.current_weeks ?? 0,
  }),
  [NOTIFICATION_KIND.STREAK_MILESTONE]: (ctx) => ({
    current_streak_weeks: ctx.streak?.current_weeks ?? 0,
  }),
  [NOTIFICATION_KIND.COACH_REPLY_READY]: () => ({
    content: "I've been thinking about what you shared.",
  }),
  [NOTIFICATION_KIND.STALE_TASKS]: (ctx) => ({
    oldest_task_title: ctx.nextTask?.title ?? FALLBACK_OPEN_TASK_EN,
  }),
};

type StubBuilder = (args: {
  language: SupportedLanguage;
  coachDisplayName: string | null;
  activeMilestoneTitle: string | null;
}) => { title: string; teaser: string };

const STUB_BUILDERS: Readonly<Record<string, StubBuilder>> = {
  [NOTIFICATION_KIND.DAILY_CHECK_IN]: ({ language, coachDisplayName }) =>
    dailyCheckInStub(language, coachDisplayName),
  [NOTIFICATION_KIND.STREAK_MILESTONE]: ({ language }) =>
    streakMilestoneStub(language),
  [NOTIFICATION_KIND.STREAK_AT_RISK]: ({ language }) =>
    streakAtRiskStub(language),
  [NOTIFICATION_KIND.STREAK_BROKEN]: ({ language }) =>
    streakBrokenStub(language),
  [NOTIFICATION_KIND.MILESTONE_PREVIEW]: ({
    language,
    coachDisplayName,
    activeMilestoneTitle,
  }) =>
    milestonePreviewStub(
      language,
      coachDisplayName,
      activeMilestoneTitle ?? FALLBACK_MILESTONE_TITLE_EN,
    ),
  [NOTIFICATION_KIND.MILESTONE_HIT]: ({ language }) =>
    milestoneHitStub(language),
  [NOTIFICATION_KIND.GOAL_HIT]: ({ language }) => goalHitStub(language),
  [NOTIFICATION_KIND.WEEK_COMPLETED]: ({ language }) =>
    weekCompletedStub(language),
};

function defaultStub(
  language: SupportedLanguage,
  coachDisplayName: string | null,
): { title: string; teaser: string } {
  const fallbackTitle = language === "fr" ? "Ton coach" : "Your coach";
  return {
    title: coachDisplayName ?? fallbackTitle,
    teaser: language === "fr" ? "Un petit rappel." : "A quick nudge.",
  };
}

function buildMemoryHooks(
  ctx: KindContext,
  coachDisplayName: string | null,
): Record<string, unknown> {
  const hooks: Record<string, unknown> = {};
  if (ctx.goal !== null) {
    hooks.goal_title = ctx.goal.title;
    if (ctx.goal.target_date !== null) {
      hooks.goal_target_date = ctx.goal.target_date;
    }
  }
  if (ctx.activeMilestone !== null) {
    hooks.active_milestone_title = ctx.activeMilestone.title;
  }
  if (ctx.milestones.length > 0) {
    hooks.milestones_completed = ctx.milestones.filter(
      (m) => m.completed_at !== null,
    ).length;
    hooks.milestones_total = ctx.milestones.length;
  }
  if (ctx.streak !== null && ctx.streak.current_weeks > 0) {
    hooks.current_streak_weeks = ctx.streak.current_weeks;
  }
  if (coachDisplayName !== null) {
    hooks.coach_display_name = coachDisplayName;
  }
  return hooks;
}

function resolveTargetLanguage(
  input: PreviewContextInput,
  profile: ProfileRow | null,
): SupportedLanguage {
  return input.languageOverride ?? resolveLanguage(profile?.language ?? null);
}

function resolveTargetCoachId(
  input: PreviewContextInput,
  profile: ProfileRow | null,
): number | null {
  return input.coachIdOverride ?? profile?.coach_id ?? null;
}

function resolveCoachDisplayName(
  coachId: number | null,
  language: SupportedLanguage,
): string | null {
  if (coachId === null) {
    return null;
  }
  const coach = COACH_BY_ID.get(coachId);
  return coach?.displayName[language] ?? null;
}

function runKindSpecificBuilder(
  kind: string,
  ctx: KindContext,
): Record<string, unknown> {
  const builder = KIND_SPECIFIC_BUILDERS[kind];
  if (builder !== undefined) {
    return builder(ctx);
  }
  return ctx.goal !== null ? { goal_title: ctx.goal.title } : {};
}

function runStubBuilder(args: {
  kind: string;
  language: SupportedLanguage;
  coachDisplayName: string | null;
  activeMilestoneTitle: string | null;
}): { title: string; teaser: string } {
  const builder = STUB_BUILDERS[args.kind];
  if (builder !== undefined) {
    return builder({
      language: args.language,
      coachDisplayName: args.coachDisplayName,
      activeMilestoneTitle: args.activeMilestoneTitle,
    });
  }
  return defaultStub(args.language, args.coachDisplayName);
}

@Injectable()
export class PreviewContextService {
  private readonly logger = new Logger(PreviewContextService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async build(
    input: PreviewContextInput,
  ): Promise<PreviewContextOutput> {
    const profile = await this.fetchProfile(input.userId);
    const language = resolveTargetLanguage(input, profile);
    const coachId = resolveTargetCoachId(input, profile);
    const coachDisplayName = resolveCoachDisplayName(coachId, language);
    const ctx = await this.loadKindContext(input.userId, profile);

    const memoryHooks = buildMemoryHooks(ctx, coachDisplayName);
    const kindSpecific = runKindSpecificBuilder(input.kind, ctx);
    const stub = runStubBuilder({
      kind: input.kind,
      language,
      coachDisplayName,
      activeMilestoneTitle: ctx.activeMilestone?.title ?? null,
    });

    return {
      language,
      coachId,
      stubTitle: stub.title,
      stubTeaser: stub.teaser,
      memoryHooks,
      kindSpecific,
      suppressStreakCopy: false,
    };
  }

  private async loadKindContext(
    userId: string,
    profile: ProfileRow | null,
  ): Promise<KindContext> {
    const goal = await this.fetchActiveGoal(userId);
    if (goal === null) {
      return {
        profile,
        goal: null,
        milestones: [],
        activeMilestone: null,
        lastCompletedMilestone: null,
        nextTask: null,
        streak: null,
      };
    }
    const [milestones, nextTask, streak] = await Promise.all([
      this.fetchMilestones(goal.id),
      this.fetchNextTask(userId, goal.id),
      this.fetchStreak(userId, goal.id),
    ]);
    const activeMilestone =
      milestones.find((m) => m.completed_at === null) ?? null;
    const lastCompletedMilestone =
      [...milestones].reverse().find((m) => m.completed_at !== null) ?? null;
    return {
      profile,
      goal,
      milestones,
      activeMilestone,
      lastCompletedMilestone,
      nextTask,
      streak,
    };
  }

  private async fetchProfile(userId: string): Promise<ProfileRow | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("coach_id, language, timezone, sto_active_hour, first_name")
      .eq("id", userId)
      .maybeSingle();
    if (error !== null) {
      this.logger.warn(`fetchProfile failed: ${error.message}`);
      return null;
    }
    return data as ProfileRow | null;
  }

  private async fetchActiveGoal(userId: string): Promise<GoalRow | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("goals")
      .select("id, title, target_date")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error !== null) {
      this.logger.warn(`fetchActiveGoal failed: ${error.message}`);
      return null;
    }
    return data as GoalRow | null;
  }

  private async fetchMilestones(goalId: string): Promise<MilestoneRow[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("milestones")
      .select("id, title, order_index, completed_at")
      .eq("goal_id", goalId)
      .order("order_index", { ascending: true });
    if (error !== null) {
      this.logger.warn(`fetchMilestones failed: ${error.message}`);
      return [];
    }
    return (data as MilestoneRow[] | null) ?? [];
  }

  private async fetchNextTask(
    userId: string,
    goalId: string,
  ): Promise<TaskRow | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("weekly_tasks")
      .select("title, is_completed")
      .eq("user_id", userId)
      .eq("goal_id", goalId)
      .eq("is_completed", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error !== null) {
      this.logger.warn(`fetchNextTask failed: ${error.message}`);
      return null;
    }
    return data as TaskRow | null;
  }

  private async fetchStreak(
    userId: string,
    goalId: string,
  ): Promise<StreakRow | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("user_streaks")
      .select("current_weeks")
      .eq("user_id", userId)
      .eq("goal_id", goalId)
      .maybeSingle();
    if (error !== null) {
      this.logger.warn(`fetchStreak failed: ${error.message}`);
      return null;
    }
    return data as StreakRow | null;
  }
}
