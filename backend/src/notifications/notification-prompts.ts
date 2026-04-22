import type { CoachConfig } from "../coach/coaches.config.js";
import { config } from "../config/app.config.js";

export type TimeOfDay = "morning" | "afternoon" | "evening";

export interface NotificationPromptInput {
  coach: CoachConfig;
  language: string;
  timeOfDay: TimeOfDay;
  goalTitle: string;
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
You are ${displayName}, the coach for the Momentum app. You write a single iOS push notification to nudge the user toward their goal right now.
</identity>

<personality>
${coach.personality}
</personality>

<response_guidelines>
- Write in ${defaultLanguage}.
- One push. Title ≤ ${String(maxTitleLength)} characters. Body 1–2 short sentences, ≤ ${String(maxBodyLength)} characters.
- Speak directly to the user. Match your personality above.
- No emoji. No quotes. No hashtags. No trailing ellipses.
- Be concrete: reference the goal or next task when provided.
</response_guidelines>

<output_format>
Return ONLY a JSON object with this exact shape, no prose, no markdown fences:
{"title": "<string>", "body": "<string>"}
</output_format>`;
}

export function buildNotificationUserPrompt(
  input: NotificationPromptInput,
): string {
  const lines = [`Time of day: ${input.timeOfDay}`, `Goal: ${input.goalTitle}`];

  if (input.nextTaskTitle !== null) {
    lines.push(`Next task: ${input.nextTaskTitle}`);
  }

  lines.push("Write the push now.");
  return lines.join("\n");
}
