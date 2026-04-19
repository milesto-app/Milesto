import type { AssembledContext } from "./context.types.js";
import type { Milestone } from "./roadmap.types.js";
import type {
  GenerationContext,
  WeekData,
  WeeklyPlan,
} from "./weekly-plan.types.js";

export interface RetryParams {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  totalChunks: number;
  label: string;
  validate: (raw: unknown) => unknown;
}

export interface GenerateWeeklyPlanParams {
  context: AssembledContext;
  milestone: Milestone;
  weekNumber: number;
  generationContext: GenerationContext;
  language: string;
}

export interface GenerateWeeklyTasksParams {
  weeklyPlan: WeeklyPlan;
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
