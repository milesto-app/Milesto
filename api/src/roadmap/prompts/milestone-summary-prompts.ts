import { buildLanguageBlock } from "../../common/language-prompt.helper.js";
import type { WeekData } from "../types/roadmap.types.js";

interface MonthlySummaryPromptParams {
  avgCompletionRate: number;
  totalCompleted: number;
  totalTasks: number;
  weeklyNarratives: string[];
}

export function buildWeeklySummaryNarrativeSystemPrompt(
  language: string,
): string {
  return `You are a coaching progress analyst. Summarize the user's milestone progress into a brief narrative.
Focus on patterns, achievements, and areas for improvement.
Return a JSON object with a single field: "narrative" containing a concise 1-3 sentence summary.
Return ONLY the JSON object, no other text.${buildLanguageBlock(language)}`;
}

export function buildWeeklySummaryNarrativeUserPrompt(
  completionRate: number,
  weekData: WeekData,
): string {
  return `Milestone Progress Data:
Completion Rate: ${String(completionRate)}%
Tasks Completed: ${String(weekData.tasksCompleted)}/${String(weekData.tasksTotal)}
Debrief Notes:
${weekData.debriefNotes.map((note, i) => `${String(i + 1)}. ${note}`).join("\n")}`;
}

export function buildMonthlySummaryNarrativeSystemPrompt(
  language: string,
): string {
  return `You are a coaching progress analyst. Summarize this month's progress based on milestone summaries.
Focus on overall trends, consistency, and growth areas.
Return a JSON object with a single field: "narrative" containing a concise monthly progress narrative.
Return ONLY the JSON object, no other text.${buildLanguageBlock(language)}`;
}

export function buildMonthlySummaryNarrativeUserPrompt(
  params: MonthlySummaryPromptParams,
): string {
  return `Monthly Progress Data:
Average Completion Rate: ${String(params.avgCompletionRate)}%
Total Tasks: ${String(params.totalCompleted)}/${String(params.totalTasks)}
Weekly Narratives:
${params.weeklyNarratives.map((n, i) => `Week ${String(i + 1)}: ${n}`).join("\n")}`;
}
