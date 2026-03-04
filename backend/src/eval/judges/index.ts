import type { PersonaJudge } from '../personas.js';
import { COACH_JUDGE } from './coach-judge.js';
import { COGNITIVE_PSYCH_JUDGE } from './cognitive-psych-judge.js';
import { DROPOUT_PREDICTOR_JUDGE } from './dropout-predictor-judge.js';
import { META_JUDGE_SYSTEM_PROMPT } from './meta-judge.js';
import { THERAPIST_JUDGE } from './therapist-judge.js';

export const ALL_PERSONA_JUDGES: PersonaJudge[] = [
  COACH_JUDGE,
  COGNITIVE_PSYCH_JUDGE,
  THERAPIST_JUDGE,
  DROPOUT_PREDICTOR_JUDGE,
];

export { META_JUDGE_SYSTEM_PROMPT };
