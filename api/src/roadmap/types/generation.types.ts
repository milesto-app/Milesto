import type { AssembledContext } from "./context.types.js";
import type { Milestone, WeekData } from "./roadmap.types.js";

export interface RetryParams {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  totalChunks: number;
  label: string;
  validate: (raw: unknown) => unknown;
}

export interface GenerateTasksParams {
  milestone: Milestone;
  context: AssembledContext;
  weekData: WeekData;
  language: string;
}

export interface MetadataParams {
  model: string;
  startTime: number;
  totalChunks: number;
  attempt: number;
}
