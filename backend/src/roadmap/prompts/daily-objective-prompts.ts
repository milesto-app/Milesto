import { buildLanguageBlock } from '../../common/language-prompt.helper.js';
import type { AssembledContext } from '../types/context.types.js';
import type { EnergyLevel } from '../types/daily.types.js';
import type { WeeklyPlan } from '../types/weekly-plan.types.js';

interface DailyObjectivePromptParams {
  weeklyPlan: WeeklyPlan;
  energyLevel: EnergyLevel;
  context: AssembledContext;
  weekData: {
    completedObjectives: number;
    totalObjectives: number;
    debriefNotes: string[];
  };
}

export function buildDailyObjectivesSystemPrompt(language: string): string {
  return `You are a coaching AI that creates personalized daily objectives.

Your task is to generate daily objectives calibrated to the user's current energy level and weekly plan progress.

Energy Calibration Rules:
- "high" or "good" energy: Generate 4-6 objectives with moderate-to-hard difficulty
- "low" or "very_low" energy: Generate 2-3 objectives with easy difficulty

Rules:
- Each objective should be specific, actionable, and achievable in a single day
- Objectives should align with the weekly plan's focus and objectives
- Consider what has already been completed this week
- Adjust difficulty and quantity based on energy level
- Include a mix of task types when appropriate

Return a JSON array of objects with these exact fields:
- "title": A concise objective title
- "description": Detailed description of what to accomplish
- "order_index": Sequential index starting from 1
- "difficulty_rating": One of "easy", "moderate", or "hard"

Return ONLY the JSON array, no other text.${buildLanguageBlock(language)}`;
}

export function buildDailyObjectivesUserPrompt(
  params: DailyObjectivePromptParams,
): string {
  const sections: string[] = [];

  sections.push(`## Weekly Plan
Focus: ${params.weeklyPlan.focus}
Objectives: ${params.weeklyPlan.objectives.map((o, i) => `${String(i + 1)}. ${o}`).join('\n')}`);

  sections.push(`## Today's Energy Level
Energy: ${params.energyLevel}`);

  sections.push(`## This Week's Progress
Completed: ${String(params.weekData.completedObjectives)}/${String(params.weekData.totalObjectives)} objectives`);

  if (params.weekData.debriefNotes.length > 0) {
    sections.push(`## Recent Debrief Notes
${params.weekData.debriefNotes.map((note, i) => `${String(i + 1)}. ${note}`).join('\n')}`);
  }

  if (params.context.goalProfileSection.length > 0) {
    sections.push(`## Goal Profile\n${params.context.goalProfileSection}`);
  }
  if (params.context.progressSection.length > 0) {
    sections.push(`## Progress History\n${params.context.progressSection}`);
  }

  return sections.join('\n\n');
}
