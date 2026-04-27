import { buildLanguageBlock } from "../../common/language-prompt.helper.js";
import type { AssembledContext } from "../types/context.types.js";
import type { WeekData, WeeklyPlan } from "../types/weekly-plan.types.js";

interface WeeklyTaskPromptParams {
  weeklyPlan: WeeklyPlan;
  context: AssembledContext;
  weekData: WeekData;
}

export function buildWeeklyTasksSystemPrompt(language: string): string {
  return `You are a coaching AI that creates personalized weekly tasks.

Your task is to generate all tasks for the entire week based on the weekly plan's objectives.

Rules:
- Generate 5-10 tasks for the week
- Each task should be specific, actionable, and achievable within the week
- Tasks should align with the weekly plan's objectives
- Consider previous week's completion data and debrief notes
- Include a mix of difficulty levels (easy, moderate, hard)
- Tasks are not assigned to specific days — the user organizes their week
- Order tasks by recommended priority (most important first)

Return a JSON array of objects with these exact fields:
- "title": A concise task title
- "description": Detailed description of what to accomplish
- "order_index": Sequential index starting from 1
- "difficulty_rating": One of "easy", "moderate", or "hard"

Return ONLY the JSON array, no other text.${buildLanguageBlock(language)}`;
}

export function buildWeeklyTasksUserPrompt(
  params: WeeklyTaskPromptParams,
): string {
  const sections: string[] = [];

  sections.push(`## Weekly Plan
Objectives: ${params.weeklyPlan.objectives.map((o, i) => `${String(i + 1)}. ${o}`).join("\n")}`);

  if (params.weekData.tasksTotal > 0) {
    sections.push(`## Previous Week's Progress
Completed: ${String(params.weekData.tasksCompleted)}/${String(params.weekData.tasksTotal)} tasks`);
  }

  if (params.weekData.debriefNotes.length > 0) {
    sections.push(`## Recent Debrief Notes
${params.weekData.debriefNotes.map((note, i) => `${String(i + 1)}. ${note}`).join("\n")}`);
  }

  if (params.context.goalProfileSection.length > 0) {
    sections.push(`## Goal Profile\n${params.context.goalProfileSection}`);
  }
  if (params.context.progressSection.length > 0) {
    sections.push(`## Progress History\n${params.context.progressSection}`);
  }

  return sections.join("\n\n");
}
