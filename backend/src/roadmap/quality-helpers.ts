import type { Logger } from '@nestjs/common';

import type { AiService } from '../ai/ai.service.js';
import { appConfig } from '../config/app.config.js';
import type {
  DailyObjectiveQualityScores,
  GenerationType,
  MilestoneQualityScores,
  WeeklyPlanQualityScores,
} from './types/quality.types.js';

const MIN_SCORE = 0;
const MAX_SCORE = 5;
const LOW_SCORE_THRESHOLD = 3;

export function clampScore(score: number): number {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(score)));
}

export interface WarningParams {
  logger: Logger;
  generationType: GenerationType;
  scores:
    | MilestoneQualityScores
    | WeeklyPlanQualityScores
    | DailyObjectiveQualityScores;
  goalId: string;
}

export function checkWarnings(params: WarningParams): void {
  for (const [dimension, value] of Object.entries(params.scores)) {
    if (dimension === 'composite') {
      continue;
    }
    if ((value as number) < LOW_SCORE_THRESHOLD) {
      params.logger.warn(
        `Low ${params.generationType} quality score for goal ${params.goalId}: ${dimension}=${value}/5`,
      );
    }
  }
}

export interface EvaluateParams {
  aiService: AiService;
  content: string;
  context: string;
  systemPrompt: string;
}

export async function evaluateQuality<T>(params: EvaluateParams): Promise<T> {
  const userPrompt = `## Content to Evaluate\n${params.content}\n\n## Context\n${params.context}`;

  return params.aiService.generateJson<T>(
    params.systemPrompt,
    userPrompt,
    appConfig.eval.judgeModel,
    {
      temperature: appConfig.eval.judgeTemperature,
      timeoutMs: appConfig.eval.callTimeoutMs,
    },
  );
}
