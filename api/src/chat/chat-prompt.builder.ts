import type { CoachConfig } from "../coach/coaches.config.js";
import type { WeekState } from "../roadmap/types/week-state.types.js";
import {
  buildBoundariesPrompt,
  buildToolUsagePrompt,
} from "./prompts/chat-tool-prompts.js";

interface GoalContext {
  goal: { title: string; description: string } | null;
  milestone: {
    title: string;
    description: string;
    expected_outcome: string;
    target_month?: number;
  } | null;
  weekState: {
    state: WeekState;
    next_week_starts_at: string | null;
    all_tasks_completed: boolean;
    has_debrief: boolean;
  };
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
    language === "fr" ? coach.displayName.fr : coach.displayName.en;
  const description =
    language === "fr" ? coach.description.fr : coach.description.en;
  const defaultLanguage = language === "fr" ? "French" : "English";
  const memoryContent = memory.length > 0 ? memory : "No memory yet.";

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
You are ${parts.displayName}, a personal development coaching assistant in the Milesto app.
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

function buildGoalContextSection(ctx: PromptInput["goalContext"]): string {
  const parts: string[] = [];

  if (ctx.goal !== null) {
    parts.push(`Goal: ${ctx.goal.title}\n${ctx.goal.description}`);
  }

  if (ctx.milestone !== null) {
    parts.push(
      `Current Milestone: ${ctx.milestone.title}\n${ctx.milestone.description}\nExpected Outcome: ${ctx.milestone.expected_outcome}`,
    );
  }

  parts.push(buildWeekStateLine(ctx.weekState));

  return `\n<goal_context>\n${parts.join("\n\n")}\n</goal_context>`;
}

function buildWeekStateLine(weekState: GoalContext["weekState"]): string {
  const unlock = weekState.next_week_starts_at ?? "soon";
  switch (weekState.state) {
    case "active":
      return `Week State: ACTIVE — user is mid-week, still has tasks to do. Next week unlocks ${unlock}.`;
    case "ready_to_debrief":
      return `Week State: READY_TO_DEBRIEF — user finished all tasks but hasn't submitted the debrief yet. Encourage reflection, not new work.`;
    case "in_advance":
      return `Week State: IN_ADVANCE — user already debriefed and is now ahead of the calendar. Next milestone is LOCKED until ${unlock}. Do not suggest new tasks; suggest rest, reflection, or light prep. Acknowledge they're ahead.`;
    case "late":
      return `Week State: LATE — calendar week ended but the user didn't finish/debrief. Be gentle, propose a rattrapage or quick adjustment. Next week starts ${unlock}.`;
    case "no_milestone":
      return `Week State: NO_MILESTONE — no active milestone yet. Help the user get started by activating their first milestone.`;
  }
}
