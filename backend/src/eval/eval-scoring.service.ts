import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service.js';
import { appConfig } from '../config/app.config.js';
import type { PersonaScores } from './personas.js';

const DEFAULT_JUDGE_RETRIES = 2;
const COMPOSITE_TOLERANCE = 0.05;
const SCORE_DECIMAL_PLACES = 2;
const SCORE_ROUNDING_FACTOR = 100;

@Injectable()
export class EvalScoringService {
  private readonly logger = new Logger(EvalScoringService.name);

  constructor(private readonly aiService: AiService) {}

  public async callJudgeWithRetry<T>(
    systemPrompt: string,
    userPrompt: string,
    judgeName: string,
  ): Promise<T> {
    for (let attempt = 0; attempt <= DEFAULT_JUDGE_RETRIES; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop -- sequential retry loop requires await
        const result = await this.aiService.generateJSON<T>(
          systemPrompt,
          userPrompt,
          appConfig.eval.judgeModel,
          {
            temperature: appConfig.eval.judgeTemperature,
            timeoutMs: appConfig.eval.callTimeoutMs,
          },
        );
        this.logger.log(`    ${judgeName}: OK`);
        return result;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (attempt < DEFAULT_JUDGE_RETRIES) {
          this.logger.warn(
            `    ${judgeName}: attempt ${attempt + 1} failed (${msg}), retrying...`,
          );
        } else {
          this.logger.error(
            `    ${judgeName}: all ${DEFAULT_JUDGE_RETRIES + 1} attempts failed (${msg})`,
          );
          throw error;
        }
      }
    }
    throw new Error('Unreachable');
  }

  public validateAndFixComposite(
    raw: PersonaScores,
    compositeFields: string[],
    personaName: string,
  ): PersonaScores {
    const serverComposite = this.recomputeComposite(raw, compositeFields);
    if (Math.abs(serverComposite - raw.composite) > COMPOSITE_TOLERANCE) {
      this.logger.warn(
        `    ${personaName}: LLM composite ${raw.composite.toFixed(SCORE_DECIMAL_PLACES)} differs from server-computed ${serverComposite.toFixed(SCORE_DECIMAL_PLACES)} — using server value`,
      );
    }
    raw.composite = serverComposite;
    return raw;
  }

  public computeCompositeByAxis(
    personaScores: Array<{ axis: string; scores: PersonaScores }>,
  ): Record<string, number> {
    const compositeByAxis: Record<string, number> = {};
    for (const ps of personaScores) {
      compositeByAxis[ps.axis] = ps.scores.composite;
    }
    return compositeByAxis;
  }

  public computeOverallComposite(
    compositeByAxis: Record<string, number>,
  ): number {
    const axisValues = Object.values(compositeByAxis);
    if (axisValues.length === 0) {
      return 0;
    }
    return axisValues.reduce((a, b) => a + b, 0) / axisValues.length;
  }

  private recomputeComposite(
    scores: PersonaScores,
    scoreFields: string[],
  ): number {
    const values: number[] = [];

    for (const field of scoreFields) {
      const val = scores[field];
      if (typeof val === 'number') {
        values.push(val);
      } else if (typeof val === 'object' && 'score' in val) {
        values.push((val as { score: number }).score);
      }
    }

    if (values.length === 0) {
      return scores.composite;
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.round(mean * SCORE_ROUNDING_FACTOR) / SCORE_ROUNDING_FACTOR;
  }
}
