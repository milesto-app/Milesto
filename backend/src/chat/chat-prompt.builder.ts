import type { CoachConfig } from '../coach/coaches.config.js';
import {
  buildBoundariesPrompt,
  buildToolUsagePrompt,
} from './prompts/chat-tool-prompts.js';

interface GoalContext {
  goal: { title: string; description: string } | null;
  milestone: {
    title: string;
    description: string;
    expected_outcome: string;
  } | null;
  weeklyPlan: {
    week_number: number;
    objectives: string[];
  } | null;
}

export interface PromptInput {
  coach: CoachConfig;
  goalContext: GoalContext;
  language: string;
  memory: string;
}

export function buildCoachPrompt(input: PromptInput): string {
  const { coach, language, memory } = input;
  const goalContextSection = buildGoalContextSection(input.goalContext);
  const displayName =
    language === 'fr' ? coach.displayName.fr : coach.displayName.en;
  const description =
    language === 'fr' ? coach.description.fr : coach.description.en;
  const defaultLanguage = language === 'fr' ? 'French' : 'English';
  const memoryContent = memory.length > 0 ? memory : 'No memory yet.';

  return buildPromptTemplate({
    displayName,
    description,
    personality: coach.personality,
    goalContextSection,
    memoryContent,
    defaultLanguage,
  });
}

interface PromptTemplateParts {
  displayName: string;
  description: string;
  personality: string;
  goalContextSection: string;
  memoryContent: string;
  defaultLanguage: string;
}

function buildPromptTemplate(parts: PromptTemplateParts): string {
  return `<identity>
You are ${parts.displayName}, a personal development coaching assistant in the Momentum app.
${parts.description}
</identity>

<personality>
${parts.personality}
</personality>${parts.goalContextSection}

<memory>
${parts.memoryContent}
</memory>

${buildToolUsagePrompt()}

<response_guidelines>
- Be brief: 1-3 short sentences per response. No filler, no fluff.
- Never repeat what the user just said or restate their question.
- Skip greetings, pleasantries, and transitions like "Great question!" or "That's awesome!".
- Get straight to the point: answer, then one concrete next step if relevant.
- Use short paragraphs. Never write walls of text.
- Adapt your tone to your personality: ${parts.personality}.
</response_guidelines>

<language>
- Respond in the same language the user writes in.
- Default to ${parts.defaultLanguage} if unclear.
</language>

${buildBoundariesPrompt()}`;
}

function buildGoalContextSection(ctx: PromptInput['goalContext']): string {
  const parts: string[] = [];

  if (ctx.goal !== null) {
    parts.push(`Goal: ${ctx.goal.title}\n${ctx.goal.description}`);
  }

  if (ctx.milestone !== null) {
    parts.push(
      `Current Milestone: ${ctx.milestone.title}\n${ctx.milestone.description}\nExpected Outcome: ${ctx.milestone.expected_outcome}`,
    );
  }

  if (ctx.weeklyPlan !== null) {
    parts.push(
      `This Week (Week ${String(ctx.weeklyPlan.week_number)}):\nObjectives:\n${ctx.weeklyPlan.objectives.map((o) => `- ${o}`).join('\n')}`,
    );
  }

  if (parts.length === 0) {
    return '';
  }

  return `\n<goal_context>\n${parts.join('\n\n')}\n</goal_context>`;
}
