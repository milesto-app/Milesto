export const GOAL_STATUS = {
  INTAKE_IN_PROGRESS: "intake_in_progress",
  INTAKE_COMPLETED: "intake_completed",
  PROFILE_GENERATING: "profile_generating",
  PROFILE_GENERATION_FAILED: "profile_generation_failed",
  ROADMAP_GENERATING: "roadmap_generating",
  ACTIVE: "active",
  COMPLETED: "completed",
} as const;

export const PROFILE_VIEWABLE_STATUSES: readonly string[] = [
  GOAL_STATUS.INTAKE_COMPLETED,
  GOAL_STATUS.ACTIVE,
];
