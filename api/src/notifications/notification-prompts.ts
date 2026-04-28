import type { CoachConfig } from "../coach/coaches.config.js";
import { config } from "../config/app.config.js";

export type TimeOfDay = "morning" | "afternoon" | "evening";

export interface NotificationPromptInput {
  coach: CoachConfig;
  language: string;
  timeOfDay: TimeOfDay;
  goalTitle: string;
  userMotivationQuote: string | null;
  weeklyObjectives: string[];
  weeklyTaskCompleted: number | null;
  weeklyTaskTotal: number | null;
  recentCompletedTitles: string[];
  nextTaskTitle: string | null;
}

export function buildNotificationSystemPrompt(
  language: string,
  coach: CoachConfig,
): string {
  const displayName =
    language === "fr" ? coach.displayName.fr : coach.displayName.en;
  const defaultLanguage = language === "fr" ? "French" : "English";
  const { maxTitleLength, maxBodyLength } = config.notifications;

  return `<identity>
You are ${displayName}, the coach for the Milesto app. You write a single iOS push notification to nudge the user toward their goal right now.
</identity>

<personality>
${coach.personality}
</personality>

<response_guidelines>
- Write in ${defaultLanguage}.
- One push. Title ≤ ${String(maxTitleLength)} characters. Body 1–2 short sentences, ≤ ${String(maxBodyLength)} characters.
- Speak directly to the user. Match your personality above.
- Be concrete: reference the goal, the user's motivation, their recent progress, or the next task when it helps.
- Emoji are welcome when they fit your personality — don't force them.
</response_guidelines>

<output_format>
Return ONLY a JSON object with this exact shape, no prose, no markdown fences:
{"title": "<string>", "body": "<string>"}
</output_format>`;
}

export function buildNotificationUserPrompt(
  input: NotificationPromptInput,
): string {
  const lines: string[] = [
    `Time of day: ${input.timeOfDay}`,
    `Goal: ${input.goalTitle}`,
  ];

  if (input.userMotivationQuote !== null) {
    lines.push(`Their motivation: "${input.userMotivationQuote}"`);
  }

  if (input.weeklyObjectives.length > 0) {
    lines.push("This week's objectives:");
    for (const objective of input.weeklyObjectives) {
      lines.push(`  - ${objective}`);
    }
  }

  if (input.weeklyTaskTotal !== null && input.weeklyTaskTotal > 0) {
    const completed = input.weeklyTaskCompleted ?? 0;
    lines.push(
      `Weekly progress: ${String(completed)} of ${String(input.weeklyTaskTotal)} tasks done`,
    );
  }

  if (input.recentCompletedTitles.length > 0) {
    lines.push("Recently completed:");
    for (const title of input.recentCompletedTitles) {
      lines.push(`  - ${title}`);
    }
  }

  if (input.nextTaskTitle !== null) {
    lines.push(`Next task: ${input.nextTaskTitle}`);
  }

  lines.push("Write the push now.");
  return lines.join("\n");
}
