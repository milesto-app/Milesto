import type { Milestone, WeekData } from "./roadmap.types.js";

export interface RetryParams {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  label: string;
  validate: (raw: unknown) => unknown;
}

export interface GenerateTasksParams {
  milestone: Milestone;
  weekData: WeekData;
  language: string;
}

export interface MetadataParams {
  model: string;
  startTime: number;
  attempt: number;
}
