import { Injectable, Logger } from "@nestjs/common";

import { AiService } from "../ai/ai.service.js";
import { config } from "../config/app.config.js";
import {
  buildMonthlySummaryNarrativeSystemPrompt,
  buildMonthlySummaryNarrativeUserPrompt,
  buildWeeklySummaryNarrativeSystemPrompt,
  buildWeeklySummaryNarrativeUserPrompt,
} from "./prompts/weekly-plan-prompts.js";
import type {
  MonthlySummary,
  WeekData,
  WeeklyPlan,
  WeeklySummary,
} from "./types/weekly-plan.types.js";

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
      weekData.tasksTotal > 0
        ? Math.round(
            (weekData.tasksCompleted / weekData.tasksTotal) *
              PERCENTAGE_MULTIPLIER,
          )
        : 0;

    const narrative = await this.tryGenerateNarrative({
      shouldGenerate: weekData.debriefNotes.length > 0,
      systemPrompt: buildWeeklySummaryNarrativeSystemPrompt(language),
      userPrompt: buildWeeklySummaryNarrativeUserPrompt(
        completionRate,
        weekData,
      ),
      label: "Weekly summary",
    });

    return {
      completion_rate: completionRate,
      tasks_completed: weekData.tasksCompleted,
      tasks_total: weekData.tasksTotal || completedPlan.objectives.length,
      debrief_count: weekData.debriefNotes.length,
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
        tasks_completed: 0,
        tasks_total: 0,
        debrief_count: 0,
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
        totalTasks: totals.totalTasks,
        weeklyNarratives,
      }),
      label: "Monthly summary",
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
      const model = config.ai.defaultModel;
      const result = await this.aiService.generateJson<{ narrative: string }>(
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
    totalTasks: number;
    avgCompletionRate: number;
    summary: Omit<MonthlySummary, "narrative">;
  } {
    const totalCompleted = weeklySummaries.reduce(
      (sum, ws) => sum + ws.tasks_completed,
      0,
    );
    const totalTasks = weeklySummaries.reduce(
      (sum, ws) => sum + ws.tasks_total,
      0,
    );
    const avgCompletionRate = Math.round(
      weeklySummaries.reduce((sum, ws) => sum + ws.completion_rate, 0) /
        weeklySummaries.length,
    );
    const totalDebriefs = weeklySummaries.reduce(
      (sum, ws) => sum + (ws.debrief_count ?? 0),
      0,
    );

    return {
      totalCompleted,
      totalTasks,
      avgCompletionRate,
      summary: {
        completion_rate: avgCompletionRate,
        tasks_completed: totalCompleted,
        tasks_total: totalTasks,
        debrief_count: totalDebriefs,
      },
    };
  }
}
