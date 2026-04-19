import { COACH_JUDGE } from "./judges/coach-judge.js";
import { COGNITIVE_PSYCH_JUDGE } from "./judges/cognitive-psych-judge.js";
import { DROPOUT_PREDICTOR_JUDGE } from "./judges/dropout-predictor-judge.js";
import { THERAPIST_JUDGE } from "./judges/therapist-judge.js";

export { META_JUDGE_SYSTEM_PROMPT } from "./judges/meta-judge.js";

export interface PersonaJudge {
  name: string;
  axis: string;
  scoreFields: string[];
  systemPrompt: string;
}

export interface MetaJudgeResult {
  weakest_question: {
    index: number;
    original: string;
    reason: string;
    improved_version: string;
    improvement_rationale: string;
  };
  strongest_question: {
    index: number;
    original: string;
    reason: string;
  };
  missing_dimensions: string[];
  batch_personality: string;
  overall_grade: string;
  grade_rationale: string;
}

export interface DimensionScore {
  score: number;
  per_question: Array<{ q: number; score: number; reason: string }>;
}

export interface PersonaScores {
  [dimension: string]: DimensionScore | number;
  composite: number;
}

export const ALL_PERSONA_JUDGES: PersonaJudge[] = [
  COACH_JUDGE,
  COGNITIVE_PSYCH_JUDGE,
  THERAPIST_JUDGE,
  DROPOUT_PREDICTOR_JUDGE,
];
