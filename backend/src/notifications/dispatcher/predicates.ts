import { Logger } from "@nestjs/common";

import type { Database } from "../../supabase/database.types.js";
import type { SupabaseService } from "../../supabase/supabase.service.js";
import { NOTIFICATION_KIND } from "../outbox/outbox.types.js";

type NotificationJobRow =
  Database["public"]["Tables"]["notification_jobs"]["Row"];

export type PredicateResult =
  | { valid: true }
  | { valid: false; reason: string };

type PredicateFn = (
  job: NotificationJobRow,
  supabaseService: SupabaseService,
) => Promise<PredicateResult>;

const logger = new Logger("DispatcherPredicates");

const dailyCheckInPredicate: PredicateFn = async (job, supabaseService) => {
  const supabase = supabaseService.getAdminClient();
  const { data: isValid, error } = await supabase.rpc(
    "daily_check_in_predicate",
    { p_user_id: job.user_id },
  );
  if (error !== null) {
    logger.warn(
      `daily_check_in predicate re-check failed for job ${job.id}: ${error.message} — allowing send (fail-open)`,
    );
    return { valid: true };
  }
  if (isValid) {
    return { valid: true };
  }
  return { valid: false, reason: "predicate_invalidated" };
};

function readTaskId(job: NotificationJobRow): string | null {
  const payload = job.payload;
  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload)
  ) {
    return null;
  }
  const kindSpecific = (payload as Record<string, unknown>)["kind_specific"];
  if (
    typeof kindSpecific !== "object" ||
    kindSpecific === null ||
    Array.isArray(kindSpecific)
  ) {
    return null;
  }
  const taskId = (kindSpecific as Record<string, unknown>)["task_id"];
  return typeof taskId === "string" ? taskId : null;
}

const implementationIntentionPredicate: PredicateFn = async (
  job,
  supabaseService,
) => {
  const taskId = readTaskId(job);
  if (taskId === null) {
    logger.warn(
      `implementation_intention predicate missing kind_specific.task_id for job ${job.id} — allowing send (fail-open)`,
    );
    return { valid: true };
  }
  const supabase = supabaseService.getAdminClient();
  const { data: isValid, error } = await supabase.rpc(
    "implementation_intention_predicate",
    { p_task_id: taskId },
  );
  if (error !== null) {
    logger.warn(
      `implementation_intention predicate re-check failed for job ${job.id}: ${error.message} — allowing send (fail-open)`,
    );
    return { valid: true };
  }
  if (isValid) {
    return { valid: true };
  }
  return { valid: false, reason: "predicate_invalidated" };
};

function readNextMilestoneId(job: NotificationJobRow): string | null {
  const payload = job.payload;
  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload)
  ) {
    return null;
  }
  const kindSpecific = (payload as Record<string, unknown>)["kind_specific"];
  if (
    typeof kindSpecific !== "object" ||
    kindSpecific === null ||
    Array.isArray(kindSpecific)
  ) {
    return null;
  }
  const nextId = (kindSpecific as Record<string, unknown>)["next_milestone_id"];
  return typeof nextId === "string" ? nextId : null;
}

const milestonePreviewPredicate: PredicateFn = async (job, supabaseService) => {
  const nextMilestoneId = readNextMilestoneId(job);
  if (nextMilestoneId === null) {
    logger.warn(
      `milestone_preview predicate missing kind_specific.next_milestone_id for job ${job.id} — allowing send (fail-open)`,
    );
    return { valid: true };
  }
  const supabase = supabaseService.getAdminClient();
  const { data: isValid, error } = await supabase.rpc(
    "milestone_preview_predicate",
    { p_milestone_id: nextMilestoneId },
  );
  if (error !== null) {
    logger.warn(
      `milestone_preview predicate re-check failed for job ${job.id}: ${error.message} — allowing send (fail-open)`,
    );
    return { valid: true };
  }
  if (isValid) {
    return { valid: true };
  }
  return { valid: false, reason: "predicate_invalidated" };
};

function readStreakGoalId(job: NotificationJobRow): string | null {
  const payload = job.payload;
  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload)
  ) {
    return null;
  }
  const kindSpecific = (payload as Record<string, unknown>)["kind_specific"];
  if (
    typeof kindSpecific !== "object" ||
    kindSpecific === null ||
    Array.isArray(kindSpecific)
  ) {
    return null;
  }
  const goalId = (kindSpecific as Record<string, unknown>)["goal_id"];
  return typeof goalId === "string" ? goalId : null;
}

function readStreakMilestoneWeeks(job: NotificationJobRow): number | null {
  const payload = job.payload;
  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload)
  ) {
    return null;
  }
  const kindSpecific = (payload as Record<string, unknown>)["kind_specific"];
  if (
    typeof kindSpecific !== "object" ||
    kindSpecific === null ||
    Array.isArray(kindSpecific)
  ) {
    return null;
  }
  const weeks = (kindSpecific as Record<string, unknown>)["weeks"];
  return typeof weeks === "number" ? weeks : null;
}

const streakAtRiskPredicate: PredicateFn = async (job, supabaseService) => {
  const goalId = readStreakGoalId(job);
  if (goalId === null) {
    logger.warn(
      `streak_at_risk predicate missing kind_specific.goal_id for job ${job.id} — allowing send (fail-open)`,
    );
    return { valid: true };
  }
  const supabase = supabaseService.getAdminClient();
  const { data: isValid, error } = await supabase.rpc(
    "streak_at_risk_predicate",
    { p_user_id: job.user_id, p_goal_id: goalId },
  );
  if (error !== null) {
    logger.warn(
      `streak_at_risk predicate re-check failed for job ${job.id}: ${error.message} — allowing send (fail-open)`,
    );
    return { valid: true };
  }
  if (isValid) {
    return { valid: true };
  }
  return { valid: false, reason: "predicate_invalidated" };
};

const streakBrokenPredicate: PredicateFn = async (job, supabaseService) => {
  const goalId = readStreakGoalId(job);
  if (goalId === null) {
    logger.warn(
      `streak_broken predicate missing kind_specific.goal_id for job ${job.id} — allowing send (fail-open)`,
    );
    return { valid: true };
  }
  const supabase = supabaseService.getAdminClient();
  const { data: isValid, error } = await supabase.rpc(
    "streak_broken_predicate",
    { p_user_id: job.user_id, p_goal_id: goalId },
  );
  if (error !== null) {
    logger.warn(
      `streak_broken predicate re-check failed for job ${job.id}: ${error.message} — allowing send (fail-open)`,
    );
    return { valid: true };
  }
  if (isValid) {
    return { valid: true };
  }
  return { valid: false, reason: "predicate_invalidated" };
};

const streakMilestonePredicate: PredicateFn = async (job, supabaseService) => {
  const goalId = readStreakGoalId(job);
  const weeks = readStreakMilestoneWeeks(job);
  if (goalId === null || weeks === null) {
    logger.warn(
      `streak_milestone predicate missing kind_specific for job ${job.id} — allowing send (fail-open)`,
    );
    return { valid: true };
  }
  const supabase = supabaseService.getAdminClient();
  const { data: isValid, error } = await supabase.rpc(
    "streak_milestone_predicate",
    { p_user_id: job.user_id, p_goal_id: goalId, p_weeks: weeks },
  );
  if (error !== null) {
    logger.warn(
      `streak_milestone predicate re-check failed for job ${job.id}: ${error.message} — allowing send (fail-open)`,
    );
    return { valid: true };
  }
  if (isValid) {
    return { valid: true };
  }
  return { valid: false, reason: "predicate_invalidated" };
};

const PREDICATES: Partial<Record<string, PredicateFn>> = {
  [NOTIFICATION_KIND.DAILY_CHECK_IN]: dailyCheckInPredicate,
  [NOTIFICATION_KIND.IMPLEMENTATION_INTENTION]:
    implementationIntentionPredicate,
  [NOTIFICATION_KIND.MILESTONE_PREVIEW]: milestonePreviewPredicate,
  [NOTIFICATION_KIND.STREAK_AT_RISK]: streakAtRiskPredicate,
  [NOTIFICATION_KIND.STREAK_BROKEN]: streakBrokenPredicate,
  [NOTIFICATION_KIND.STREAK_MILESTONE]: streakMilestonePredicate,
};

export async function recheckPredicate(
  job: NotificationJobRow,
  supabaseService: SupabaseService,
): Promise<PredicateResult> {
  const predicate = PREDICATES[job.kind];
  if (predicate === undefined) {
    return { valid: true };
  }
  return predicate(job, supabaseService);
}
