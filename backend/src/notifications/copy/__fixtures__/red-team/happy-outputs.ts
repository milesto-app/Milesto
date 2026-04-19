// Minimum-bar LLM outputs the validator must always accept (M2.9.2).
//
// Kept next to bad-outputs.ts so the "happy grid" and "red-team grid"
// evolve as a single story — when banned-phrases.ts changes, reviewers
// can check both files in the same read.

import type { SupportedLanguage } from "../../fallbacks.js";

export interface HappyOutputFixture {
  readonly name: string;
  readonly language: SupportedLanguage;
  readonly suppressStreakCopy: boolean;
  readonly rawOutput: string;
}

function out(title: string, body: string): string {
  return JSON.stringify({ title, body });
}

export const HAPPY_OUTPUT_FIXTURES: readonly HappyOutputFixture[] = [
  {
    name: "en/daily_check_in/plain",
    language: "en",
    suppressStreakCopy: false,
    rawOutput: out("Your coach", "Ready for today's plan? One task is enough."),
  },
  {
    name: "en/milestone_preview/plain",
    language: "en",
    suppressStreakCopy: false,
    rawOutput: out(
      "Next up",
      "Tomorrow's milestone is two short tasks. Quick scan before bed?",
    ),
  },
  {
    name: "en/streak_milestone/suppressed-avoids-streak",
    language: "en",
    suppressStreakCopy: true,
    rawOutput: out(
      "Nice run",
      "Three weeks of showing up. Keep the rhythm simple.",
    ),
  },
  {
    name: "fr/daily_check_in/plain",
    language: "fr",
    suppressStreakCopy: false,
    rawOutput: out(
      "Ton coach",
      "Prêt pour le plan du jour ? Une tâche suffit pour avancer.",
    ),
  },
  {
    name: "fr/milestone_preview/plain",
    language: "fr",
    suppressStreakCopy: false,
    rawOutput: out(
      "La suite",
      "Demain, deux petites tâches pour franchir l'étape. Tu scannes ?",
    ),
  },
  {
    name: "fr/streak_milestone/suppressed-avoids-serie",
    language: "fr",
    suppressStreakCopy: true,
    rawOutput: out(
      "Bien joué",
      "Trois semaines régulières. Continue sur ce rythme simple.",
    ),
  },
];
