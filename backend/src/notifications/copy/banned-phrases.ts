// Banned-phrase stem lists for the notification copy-gen validator (M2.9.2).
//
// Design reference: docs/implementation/notification-plan.md §11.9.
//
// Four axes, per language:
//   1. Parasocial ("we miss you", "we're here for you") — implies the app
//      has feelings about the user's absence. The coach persona is an
//      opinionated voice, not a friend who mourns missed logins.
//   2. Phantom-emotional ("your coach is disappointed / proud / worried") —
//      manufactures an emotion the user cannot verify. Always unearned.
//   3. Shame-based ("you let yourself down", "you failed") — weaponizes
//      guilt to force engagement. Retention built on shame churns.
//   4. Fake urgency / fake social proof ("everyone is ahead of you",
//      "last chance", "users like you are…") — manipulative patterns.
//
// Matching rules (applied by validators.ts):
//   - Normalize input: lowercase + NFD-decompose + strip combining marks.
//   - Each pattern is matched with word-boundary semantics on the
//     normalized string. Patterns are *stems*, so "disappoint" catches
//     "disappoints", "disappointed", "disappointing".
//   - A single hit is a hard rejection (errorCode='banned_phrase').

import type { SupportedLanguage } from "./fallbacks.js";
import { SUPPORTED_LANGUAGES } from "./fallbacks.js";

export interface BannedPhraseHit {
  readonly pattern: string;
  readonly language: SupportedLanguage;
}

const EN_BANNED_STEMS: readonly string[] = [
  // Parasocial
  "we miss you",
  "we missed you",
  "we're here for you",
  "we are here for you",
  "come back to us",
  // Phantom-emotional
  "your coach is disappoint",
  "your coach is proud",
  "your coach is worried",
  "your coach feels",
  "i'm disappoint",
  "i am disappoint",
  "i'm so proud of you",
  "i am so proud of you",
  "makes me sad",
  "makes me happy",
  // Shame-based
  "you let yourself down",
  "you let me down",
  "you let us down",
  "you failed",
  "you're failing",
  "you are failing",
  "giving up on yourself",
  "disappointed in you",
  // Fake urgency / fake social proof
  "last chance",
  "final warning",
  "everyone is ahead",
  "everyone else is",
  "users like you",
  "people like you",
  "don't be the one",
];

const FR_BANNED_STEMS: readonly string[] = [
  // Parasocial
  "tu nous manques",
  "vous nous manquez",
  "on est la pour toi",
  "on est la pour vous",
  "on pense a toi",
  "reviens vers nous",
  // Phantom-emotional
  "ton coach est decu",
  "ton coach est fier",
  "ton coach est inquiet",
  "ton coach ressent",
  "je suis decu",
  "je suis fier de toi",
  "ca me rend triste",
  "ca me rend heureux",
  // Shame-based
  "tu t'es laisse tomber",
  "tu t'es laissee tomber",
  "tu m'as laisse tomber",
  "tu as echoue",
  "tu echoues",
  "tu abandonnes",
  "decu de toi",
  // Fake urgency / fake social proof
  "derniere chance",
  "dernier avertissement",
  "tout le monde est en avance",
  "les autres sont",
  "les utilisateurs comme toi",
  "les gens comme toi",
];

const BANNED_BY_LANGUAGE: Readonly<
  Record<SupportedLanguage, readonly string[]>
> = {
  en: EN_BANNED_STEMS,
  fr: FR_BANNED_STEMS,
};

// Streak-related stems. Blocked only when suppressStreakCopy=true, per
// §5.7 — users in their first 60 days shouldn't be pressured by streak
// framing before they've formed a habit of completing.
const STREAK_STEMS_BY_LANGUAGE: Readonly<
  Record<SupportedLanguage, readonly string[]>
> = {
  en: ["streak"],
  fr: ["serie", "series"],
};

/**
 * Normalize a string for banned-phrase matching.
 *
 *   "C'est déçu !"  →  "c'est decu !"
 *
 * NFD decomposition + combining-mark strip folds accents to their base
 * letter so the French stem list can stay ASCII.
 */
export function normalizeForMatch(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Returns the first banned-phrase hit in `text`, or null if clean.
 * Matches are substring-based on the normalized text; the upstream stems
 * already include trailing characters (like "you failed") that prevent
 * false positives from unrelated words.
 */
export function findBannedPhrase(
  text: string,
  language: SupportedLanguage,
): BannedPhraseHit | null {
  const normalized = normalizeForMatch(text);
  const stems = BANNED_BY_LANGUAGE[language];
  for (const pattern of stems) {
    if (normalized.includes(pattern)) {
      return { pattern, language };
    }
  }
  return null;
}

/**
 * Returns the first streak-stem hit in `text`, or null. Call this only
 * when `suppressStreakCopy` is true for the target user (M2.9 §5.7).
 */
export function findStreakMention(
  text: string,
  language: SupportedLanguage,
): BannedPhraseHit | null {
  const normalized = normalizeForMatch(text);
  const stems = STREAK_STEMS_BY_LANGUAGE[language];
  for (const pattern of stems) {
    // Word boundaries: "serieusement" must not trigger on "serie". We
    // rebuild a regex per call; the stem list is tiny so overhead is trivial.
    const regex = new RegExp(`\\b${pattern}\\b`);
    if (regex.test(normalized)) {
      return { pattern, language };
    }
  }
  return null;
}

export function allBannedLanguages(): readonly SupportedLanguage[] {
  return SUPPORTED_LANGUAGES;
}
