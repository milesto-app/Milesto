export type { DimensionScore, MetaJudgeResult, PersonaJudge, PersonaScores };
export {
  ALL_PERSONA_JUDGES,
  META_JUDGE_SYSTEM_PROMPT,
} from "./judges/index.js";

interface PersonaJudge {
  name: string;
  axis: string;
  scoreFields: string[];
  systemPrompt: string;
}

interface MetaJudgeResult {
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

interface DimensionScore {
  score: number;
  per_question: Array<{ q: number; score: number; reason: string }>;
}

interface PersonaScores {
  [dimension: string]: DimensionScore | number;
  composite: number;
}
