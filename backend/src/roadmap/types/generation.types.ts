import type { AssembledContext } from './context.types.js';
import type { Milestone } from './roadmap.types.js';
import type { GenerationContext, WeeklyPlan } from './weekly-plan.types.js';
import type { EnergyLevel } from './daily.types.js';

export interface UsageRef {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface RetryParams {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  timeoutMs: number;
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

export interface GenerateDailyParams {
  weeklyPlan: WeeklyPlan;
  energyLevel: EnergyLevel;
  context: AssembledContext;
  weekData: {
    completedObjectives: number;
    totalObjectives: number;
    debriefNotes: string[];
  };
  language: string;
}

export interface MetadataParams {
  model: string;
  startTime: number;
  totalChunks: number;
  attempt: number;
  usageRef: UsageRef;
}
