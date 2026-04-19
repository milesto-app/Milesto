// Single source of truth for stub notification copy.
//
// Every producer that enqueues a kind eligible for copy-gen writes a stub
// {title, teaser} at insert time. If the pre-dispatch consumer (M2.9.3)
// generates LLM copy, the dispatcher joins it in; if generation fails or
// the job is ineligible (kill-switch, rollout %, short-fuse path fails),
// the dispatcher falls back to this stub. Keeping the stubs here — rather
// than sprinkled across producers — guarantees the fallback copy is
// consistent with what the validator's red-team fixtures (M2.9.2) treat
// as the "known-safe" baseline.
//
// Kinds not covered here:
//   - coach_reply_ready: teaser IS the assistant message content.
//   - implementation_intention: teaser is a dynamic if-then template built
//     from day/hour/location/task_title in intention.producer.ts.

export const SUPPORTED_LANGUAGES = ["en", "fr"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export interface StubCopy {
  readonly title: string;
  readonly teaser: string;
}

const FALLBACK_COACH_TITLE: Readonly<Record<SupportedLanguage, string>> = {
  en: "Your coach",
  fr: "Ton coach",
};

const BRAND_TITLE = "Momentum";

const DAILY_CHECK_IN_TEASER: Readonly<Record<SupportedLanguage, string>> = {
  en: "Ready for today's plan?",
  fr: "Prêt pour le plan du jour ?",
};

const STREAK_MILESTONE_TEASER: Readonly<Record<SupportedLanguage, string>> = {
  en: "Weekly streak extended.",
  fr: "Série hebdomadaire prolongée.",
};

const STREAK_AT_RISK_TEASER: Readonly<Record<SupportedLanguage, string>> = {
  en: "Your streak is close — don't drop it.",
  fr: "Ta série est en jeu — ne la lâche pas.",
};

const STREAK_BROKEN_TEASER: Readonly<Record<SupportedLanguage, string>> = {
  en: "Let's pick up where you left off.",
  fr: "Reprends là où tu t'étais arrêté.",
};

const MILESTONE_PREVIEW_TEASER_PREFIX: Readonly<
  Record<SupportedLanguage, string>
> = {
  en: "Next up: ",
  fr: "La suite : ",
};

const MILESTONE_HIT_TITLE: Readonly<Record<SupportedLanguage, string>> = {
  en: "Milestone unlocked!",
  fr: "Étape franchie !",
};

const MILESTONE_HIT_TEASER: Readonly<Record<SupportedLanguage, string>> = {
  en: "Nicely done — momentum is building.",
  fr: "Bien joué — l'élan s'installe.",
};

const GOAL_HIT_TITLE: Readonly<Record<SupportedLanguage, string>> = {
  en: "Goal complete!",
  fr: "Objectif atteint !",
};

const GOAL_HIT_TEASER: Readonly<Record<SupportedLanguage, string>> = {
  en: "You crossed the finish line. Take it in.",
  fr: "Tu as franchi la ligne d'arrivée. Savoure.",
};

const WEEK_COMPLETED_TITLE: Readonly<Record<SupportedLanguage, string>> = {
  en: "Week wrapped up",
  fr: "Semaine bouclée",
};

const WEEK_COMPLETED_TEASER: Readonly<Record<SupportedLanguage, string>> = {
  en: "Another one in the bag — keep the streak going.",
  fr: "Encore une de faite — continue sur ta lancée.",
};

export function resolveLanguage(
  raw: string | null | undefined,
): SupportedLanguage {
  if (raw === null || raw === undefined) {
    return "en";
  }
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(raw)
    ? (raw as SupportedLanguage)
    : "en";
}

export function fallbackCoachTitle(language: SupportedLanguage): string {
  return FALLBACK_COACH_TITLE[language];
}

function resolveCoachTitle(
  language: SupportedLanguage,
  coachDisplayName: string | null | undefined,
): string {
  if (coachDisplayName === null || coachDisplayName === undefined) {
    return FALLBACK_COACH_TITLE[language];
  }
  const trimmed = coachDisplayName.trim();
  return trimmed === "" ? FALLBACK_COACH_TITLE[language] : trimmed;
}

export function dailyCheckInStub(
  language: SupportedLanguage,
  coachDisplayName: string | null | undefined,
): StubCopy {
  return {
    title: resolveCoachTitle(language, coachDisplayName),
    teaser: DAILY_CHECK_IN_TEASER[language],
  };
}

export function streakMilestoneStub(language: SupportedLanguage): StubCopy {
  return { title: BRAND_TITLE, teaser: STREAK_MILESTONE_TEASER[language] };
}

export function streakAtRiskStub(language: SupportedLanguage): StubCopy {
  return { title: BRAND_TITLE, teaser: STREAK_AT_RISK_TEASER[language] };
}

export function streakBrokenStub(language: SupportedLanguage): StubCopy {
  return { title: BRAND_TITLE, teaser: STREAK_BROKEN_TEASER[language] };
}

export function milestonePreviewStub(
  language: SupportedLanguage,
  coachDisplayName: string | null | undefined,
  nextMilestoneName: string,
): StubCopy {
  return {
    title: resolveCoachTitle(language, coachDisplayName),
    teaser: `${MILESTONE_PREVIEW_TEASER_PREFIX[language]}${nextMilestoneName}`,
  };
}

export function milestoneHitStub(language: SupportedLanguage): StubCopy {
  return {
    title: MILESTONE_HIT_TITLE[language],
    teaser: MILESTONE_HIT_TEASER[language],
  };
}

export function goalHitStub(language: SupportedLanguage): StubCopy {
  return {
    title: GOAL_HIT_TITLE[language],
    teaser: GOAL_HIT_TEASER[language],
  };
}

export function weekCompletedStub(language: SupportedLanguage): StubCopy {
  return {
    title: WEEK_COMPLETED_TITLE[language],
    teaser: WEEK_COMPLETED_TEASER[language],
  };
}
