import { buildLanguageBlock } from "../../common/language-prompt.helper.js";
import type { AssembledContext } from "../types/context.types.js";
import type { Milestone, WeekData } from "../types/roadmap.types.js";

interface TaskPromptParams {
  milestone: Milestone;
  context: AssembledContext;
  weekData: WeekData;
}

export function buildTasksSystemPrompt(language: string): string {
  return `You are a coaching AI that creates personalized weekly tasks.

Your task is to generate all tasks for the entire week based on the current milestone's objectives.

Rules:
- Generate 5-10 tasks for the week
- Each task should be specific, actionable, and achievable within the week
- Tasks should align with the milestone description and expected outcome
- Consider previous debrief notes
- Mix shorter and longer tasks so the week has both quick wins and deeper work
- Tasks are not assigned to specific days — the user organizes their week
- Order tasks by recommended priority (most important first)

Return a JSON array of objects with these exact fields:
- "title": A concise task title
- "description": Detailed description of what to accomplish
- "order_index": Sequential index starting from 1
- "estimated_minutes": Realistic integer estimate of focused minutes to complete the task (typical range 5–120)

Return ONLY the JSON array, no other text.${buildLanguageBlock(language)}`;
}

export function buildTasksUserPrompt(params: TaskPromptParams): string {
  const sections: string[] = [];

  sections.push(`## Current Milestone
Title: ${params.milestone.title}
Description: ${params.milestone.description}
Expected Outcome: ${params.milestone.expected_outcome}`);

  if (params.weekData.tasksTotal > 0) {
    sections.push(`## Previous Progress
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
