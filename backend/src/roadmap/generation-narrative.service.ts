import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service.js';
import { appConfig } from '../config/app.config.js';
import {
  buildWeeklySummaryNarrativeSystemPrompt,
  buildWeeklySummaryNarrativeUserPrompt,
  buildMonthlySummaryNarrativeSystemPrompt,
  buildMonthlySummaryNarrativeUserPrompt,
} from './prompts/weekly-plan-prompts.js';
import type {
  MonthlySummary,
  WeekData,
  WeeklySummary,
  WeeklyPlan,
} from './types/weekly-plan.types.js';

const PERCENTAGE_MULTIPLIER = 100;

@Injectable()
export class GenerationNarrativeService {
  private readonly logger = new Logger(GenerationNarrativeService.name);

  constructor(private readonly aiService: AiService) {}

  public async generateWeeklySummary(
    completedPlan: WeeklyPlan,
    weekData: WeekData,
    language: string,
  ): Promise<WeeklySummary> {
    const completionRate =
      weekData.objectivesTotal > 0
        ? Math.round(
            (weekData.objectivesCompleted / weekData.objectivesTotal) * PERCENTAGE_MULTIPLIER,
          )
        : 0;

    const narrative = await this.tryGenerateNarrative({
      shouldGenerate: weekData.debriefNotes.length > 0,
      systemPrompt: buildWeeklySummaryNarrativeSystemPrompt(language),
      userPrompt: buildWeeklySummaryNarrativeUserPrompt(completionRate, weekData),
      label: 'Weekly summary',
    });

    return {
      completion_rate: completionRate,
      objectives_completed: weekData.objectivesCompleted,
      objectives_total: weekData.objectivesTotal || completedPlan.objectives.length,
      debrief_count: weekData.debriefNotes.length,
      energy_distribution: weekData.energyDistribution,
      ...(narrative !== undefined ? { narrative } : {}),
    };
  }

  public async generateMonthlySummary(
    weeklySummaries: WeeklySummary[],
    language: string,
  ): Promise<MonthlySummary> {
    if (weeklySummaries.length === 0) {
      return {
        completion_rate: 0,
        objectives_completed: 0,
        objectives_total: 0,
        debrief_count: 0,
        energy_distribution: {},
      };
    }

    const totals = this.aggregateWeeklyTotals(weeklySummaries);
    const weeklyNarratives = weeklySummaries
      .filter((ws) => ws.narrative !== undefined)
      .map((ws) => ws.narrative as string);

    const narrative = await this.tryGenerateNarrative({
      shouldGenerate: weeklyNarratives.length > 0,
      systemPrompt: buildMonthlySummaryNarrativeSystemPrompt(language),
      userPrompt: buildMonthlySummaryNarrativeUserPrompt({
        avgCompletionRate: totals.avgCompletionRate,
        totalCompleted: totals.totalCompleted,
        totalObjectives: totals.totalObjectives,
        weeklyNarratives,
      }),
      label: 'Monthly summary',
    });

    return {
      ...totals.summary,
      ...(narrative !== undefined ? { narrative } : {}),
    };
  }

  private async tryGenerateNarrative(params: {
    shouldGenerate: boolean;
    systemPrompt: string;
    userPrompt: string;
    label: string;
  }): Promise<string | undefined> {
    if (!params.shouldGenerate) {
      return undefined;
    }
    try {
      const model = appConfig.ai.defaultModel;
      const result = await this.aiService.generateJSON<{ narrative: string }>(
        params.systemPrompt,
        params.userPrompt,
        model,
      );
      return result.narrative;
    } catch (error) {
      this.logger.warn(
        `${params.label} narrative generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    }
  }

  private aggregateWeeklyTotals(weeklySummaries: WeeklySummary[]): {
    totalCompleted: number;
    totalObjectives: number;
    avgCompletionRate: number;
    summary: Omit<MonthlySummary, 'narrative'>;
  } {
    const totalCompleted = weeklySummaries.reduce((sum, ws) => sum + ws.objectives_completed, 0);
    const totalObjectives = weeklySummaries.reduce((sum, ws) => sum + ws.objectives_total, 0);
    const avgCompletionRate = Math.round(
      weeklySummaries.reduce((sum, ws) => sum + ws.completion_rate, 0) / weeklySummaries.length,
    );
    const totalDebriefs = weeklySummaries.reduce((sum, ws) => sum + (ws.debrief_count ?? 0), 0);

    const aggregatedEnergy: Record<string, number> = {};
    for (const ws of weeklySummaries) {
      if (ws.energy_distribution !== undefined) {
        for (const [level, count] of Object.entries(ws.energy_distribution)) {
          aggregatedEnergy[level] = (aggregatedEnergy[level] ?? 0) + count;
        }
      }
    }

    return {
      totalCompleted,
      totalObjectives,
      avgCompletionRate,
      summary: {
        completion_rate: avgCompletionRate,
        objectives_completed: totalCompleted,
        objectives_total: totalObjectives,
        debrief_count: totalDebriefs,
        energy_distribution: aggregatedEnergy,
      },
    };
  }
}
