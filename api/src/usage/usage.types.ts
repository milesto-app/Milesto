export enum GenerationType {
  GOAL_TITLE = "GOAL_TITLE",
  INTAKE_BATCH = "INTAKE_BATCH",
  GOAL_PROFILE = "GOAL_PROFILE",
  MILESTONE_ROADMAP = "MILESTONE_ROADMAP",
  WEEKLY_PLAN = "WEEKLY_PLAN",
  DAILY_OBJECTIVES = "DAILY_OBJECTIVES",
  CHAT_MESSAGE = "CHAT_MESSAGE",
  VOICE_TRANSCRIPTION = "VOICE_TRANSCRIPTION",
}

export interface ReservationResult {
  granted: boolean;
  used: number;
  limit: number;
}
