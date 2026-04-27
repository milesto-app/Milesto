import type { MetaJudgeResult, PersonaScores } from "./personas.js";

export interface EvalQuestion {
  question_text: string;
  question_type: string;
  config: Record<string, unknown> | null;
}

export interface EvalPriorBatch {
  batch_number: number;
  questions: Array<{
    question_text: string;
    question_type: string;
    answer: string;
  }>;
}

export interface BatchEvalResult {
  label: string;
  questions: EvalQuestion[];
  personaScores: Array<{ judge: string; axis: string; scores: PersonaScores }>;
  metaJudge: MetaJudgeResult | null;
  compositeByAxis: Record<string, number>;
  overallComposite: number;
}

export interface GoalEvalResult {
  domain: string;
  goalDescription: string;
  universalBatch: BatchEvalResult;
  aiBatches: BatchEvalResult[];
  completedAtBatch: number;
  goldBatch: BatchEvalResult;
  delta: Record<string, number>;
}

export interface EvalReport {
  timestamp: string;
  goals: GoalEvalResult[];
}

export interface EvalBatchOptions {
  goalDescription: string;
  questions: EvalQuestion[];
  goldStandard: {
    questions: EvalQuestion[];
    domain: string;
    goalDescription: string;
  } | null;
  label: string;
  priorBatches: EvalPriorBatch[] | null;
  isGoldStandard: boolean;
}
