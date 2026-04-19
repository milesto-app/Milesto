import { COACH_BY_ID } from "../../coach/coaches.config.js";

export const PERSONA_BUCKET = {
  DRILL: "drill",
  STANDARD: "standard",
  GENTLE: "gentle",
} as const;

export type PersonaBucket =
  (typeof PERSONA_BUCKET)[keyof typeof PERSONA_BUCKET];

const PERSONALITY_TO_BUCKET: Readonly<Record<string, PersonaBucket>> = {
  strict: PERSONA_BUCKET.DRILL,
  motivateur: PERSONA_BUCKET.STANDARD,
  complice: PERSONA_BUCKET.STANDARD,
  zen: PERSONA_BUCKET.GENTLE,
};

const DEFAULT_HOUR_BY_BUCKET: Readonly<Record<PersonaBucket, number>> = {
  [PERSONA_BUCKET.DRILL]: 7,
  [PERSONA_BUCKET.STANDARD]: 19,
  [PERSONA_BUCKET.GENTLE]: 20,
};

const FALLBACK_BUCKET: PersonaBucket = PERSONA_BUCKET.STANDARD;

export function resolvePersonaBucket(coachId: number | null): PersonaBucket {
  if (coachId === null) {
    return FALLBACK_BUCKET;
  }
  const coach = COACH_BY_ID.get(coachId);
  if (coach === undefined) {
    return FALLBACK_BUCKET;
  }
  return PERSONALITY_TO_BUCKET[coach.personality] ?? FALLBACK_BUCKET;
}

export function getPersonaDefaultHour(coachId: number | null): number {
  return DEFAULT_HOUR_BY_BUCKET[resolvePersonaBucket(coachId)];
}
