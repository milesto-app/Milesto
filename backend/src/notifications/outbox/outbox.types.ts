import type { SupportedLanguage } from "../copy/fallbacks.js";

export const NOTIFICATION_KIND = {
  COACH_REPLY_READY: "coach_reply_ready",
  ROADMAP_GENERATED: "roadmap_generated",
  WEEKLY_PLAN_PUBLISHED: "weekly_plan_published",
  STREAK_AT_RISK: "streak_at_risk",
  COACH_PROACTIVE: "coach_proactive",
  PLAN_NOT_GENERATED: "plan_not_generated",
  WEEKLY_DEBRIEF_PROMPT: "weekly_debrief_prompt",
  WINBACK_STEP: "winback_step",
  MILESTONE_COUNTDOWN: "milestone_countdown",
  GOAL_DEADLINE_COUNTDOWN: "goal_deadline_countdown",
  DAILY_CHECK_IN: "daily_check_in",
  IMPLEMENTATION_INTENTION: "implementation_intention",
  WEEK_COMPLETION_GAP: "week_completion_gap",
  MILESTONE_HIT: "milestone_hit",
  MILESTONE_PREVIEW: "milestone_preview",
  GOAL_HIT: "goal_hit",
  WEEK_COMPLETED: "week_completed",
  STREAK_MILESTONE: "streak_milestone",
  STREAK_BROKEN: "streak_broken",
  UNEXPECTED_WIN: "unexpected_win",
  STALE_TASKS: "stale_tasks",
} as const;

export type NotificationKind =
  (typeof NOTIFICATION_KIND)[keyof typeof NOTIFICATION_KIND];

export const NOTIFICATION_TIER = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
} as const;

export type NotificationTier =
  (typeof NOTIFICATION_TIER)[keyof typeof NOTIFICATION_TIER];

/**
 * Inputs the M2.9.3 eligibility helper needs to hash + gate copy-gen for this
 * job. Producers pass this when the kind is copy-gen-relevant; omit for kinds
 * that never generate copy (the row gets `copy_status='skipped_stub'`).
 *
 * `producerName` is required for short-fuse kinds (celebrations,
 * streak_milestone) because the outbox stamps the job's lease with
 * `copy_claimed_by='producer:<producerName>'` so the pre-dispatch consumer
 * never double-claims.
 */
export interface CopyGenProducerInputs {
  readonly language: SupportedLanguage;
  readonly coachId: number | null;
  readonly memoryHooks: Readonly<Record<string, unknown>>;
  readonly kindSpecific: Readonly<Record<string, unknown>>;
  readonly suppressStreakCopy: boolean;
  readonly producerName?: string;
}

export interface OutboxJobInput {
  userId: string;
  kind: NotificationKind;
  tier: NotificationTier;
  dedupKey: string;
  scheduledForUtc: Date;
  localDate?: string;
  payload: Record<string, unknown>;
  sequenceId?: string;
  sequenceStep?: number;
  experimentId?: string;
  variant?: string;
  copyGen?: CopyGenProducerInputs;
}
