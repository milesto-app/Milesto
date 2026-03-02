import type { AssembledContext } from '../types/context.types.js';
import type { Milestone } from '../types/roadmap.types.js';
import type { GenerationContext, WeekData } from '../types/weekly-plan.types.js';

interface WeeklyPlanPromptParams {
  context: AssembledContext;
  milestone: Milestone;
  weekNumber: number;
  generationContext: GenerationContext;
}

interface MonthlySummaryPromptParams {
  avgCompletionRate: number;
  totalCompleted: number;
  totalObjectives: number;
  weeklyNarratives: string[];
}

export function buildWeeklyPlanSystemPrompt(): string {
  return `You are a coaching AI that creates personalized weekly plans.

Your task is to generate a focused weekly plan based on the user's current milestone, progress, and context.

Rules:
- Create a clear, actionable focus statement for the week
- Generate 3-7 specific, achievable objectives
- Objectives should be concrete daily or multi-day actions
- Consider the user's recent progress, energy levels, and capacity
- Build on previous week's momentum if summary data is available
- Adapt difficulty based on completion rates from previous weeks

Return a JSON object with these exact fields:
- "focus": A concise statement of the week's primary focus area
- "objectives": An array of specific, actionable objective strings

Return ONLY the JSON object, no other text.`;
}

export function buildWeeklyPlanUserPrompt(params: WeeklyPlanPromptParams): string {
  const sections: string[] = [];
  sections.push(buildMilestoneSection(params));
  sections.push(`## Week Info\nWeek Number: ${String(params.weekNumber)}`);
  appendSummaryContextSections(sections, params.generationContext);
  appendRetrievedContextSections(sections, params.context);
  return sections.join('\n\n');
}

function buildMilestoneSection(params: WeeklyPlanPromptParams): string {
  return `## Current Milestone
Title: ${params.milestone.title}
Description: ${params.milestone.description}
Expected Outcome: ${params.milestone.expected_outcome}
Target Month: ${String(params.milestone.target_month)}`;
}

function appendSummaryContextSections(sections: string[], genCtx: GenerationContext): void {
  if (genCtx.last_weekly_summary !== null && genCtx.last_weekly_summary !== undefined) {
    const ws = genCtx.last_weekly_summary;
    sections.push(`## Last Week Summary
Completion Rate: ${String(ws.completion_rate)}%
Objectives Completed: ${String(ws.objectives_completed)}/${String(ws.objectives_total)}
${ws.narrative !== undefined ? `Narrative: ${ws.narrative}` : ''}`);
  }

  if (genCtx.last_monthly_summary !== null && genCtx.last_monthly_summary !== undefined) {
    sections.push(`## Monthly Summary\n${JSON.stringify(genCtx.last_monthly_summary)}`);
  }

  if (genCtx.daily_completion_rate !== undefined) {
    sections.push(`## Recent Daily Performance
Completion Rate: ${String(genCtx.daily_completion_rate)}%
Completed: ${String(genCtx.daily_objectives_completed ?? 0)}/${String(genCtx.daily_objectives_total ?? 0)}`);
  }
}

function appendRetrievedContextSections(sections: string[], context: AssembledContext): void {
  if (context.goalProfileSection.length > 0) {
    sections.push(`## Goal Profile\n${context.goalProfileSection}`);
  }
  if (context.intakeSection.length > 0) {
    sections.push(`## Intake Q&A\n${context.intakeSection}`);
  }
  if (context.progressSection.length > 0) {
    sections.push(`## Progress History\n${context.progressSection}`);
  }
  if (context.debriefSection.length > 0) {
    sections.push(`## Recent Debriefs\n${context.debriefSection}`);
  }
}

export function buildWeeklySummaryNarrativeSystemPrompt(): string {
  return `You are a coaching progress analyst. Summarize the user's weekly progress into a brief narrative.
Focus on patterns, achievements, and areas for improvement.
Return a JSON object with a single field: "narrative" containing a concise 1-3 sentence summary.
Return ONLY the JSON object, no other text.`;
}

export function buildWeeklySummaryNarrativeUserPrompt(
  completionRate: number,
  weekData: WeekData,
): string {
  return `Weekly Progress Data:
Completion Rate: ${String(completionRate)}%
Objectives Completed: ${String(weekData.objectivesCompleted)}/${String(weekData.objectivesTotal)}
Energy Distribution: ${JSON.stringify(weekData.energyDistribution)}
Debrief Notes:
${weekData.debriefNotes.map((note, i) => `${String(i + 1)}. ${note}`).join('\n')}`;
}

export function buildMonthlySummaryNarrativeSystemPrompt(): string {
  return `You are a coaching progress analyst. Summarize this month's progress based on weekly summaries.
Focus on overall trends, consistency, and growth areas.
Return a JSON object with a single field: "narrative" containing a concise monthly progress narrative.
Return ONLY the JSON object, no other text.`;
}

export function buildMonthlySummaryNarrativeUserPrompt(params: MonthlySummaryPromptParams): string {
  return `Monthly Progress Data:
Average Completion Rate: ${String(params.avgCompletionRate)}%
Total Objectives: ${String(params.totalCompleted)}/${String(params.totalObjectives)}
Weekly Narratives:
${params.weeklyNarratives.map((n, i) => `Week ${String(i + 1)}: ${n}`).join('\n')}`;
}
