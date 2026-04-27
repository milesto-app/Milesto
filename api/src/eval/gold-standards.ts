import type { PriorBatchContext } from "../intake/intake-prompt.service.js";
import { CAREER_PIVOT_STANDARD } from "./gold-standards/career-pivot.js";
import { DATING_STANDARD } from "./gold-standards/dating.js";
import { LANGUAGE_LEARNING_STANDARD } from "./gold-standards/language-learning.js";
import { SAVING_MONEY_STANDARD } from "./gold-standards/saving-money.js";
import { WEIGHT_LOSS_STANDARD } from "./gold-standards/weight-loss.js";

export interface GoldStandardQuestion {
  question_text: string;
  question_type: "text" | "scale" | "single_choice" | "multiple_choice";
  config: Record<string, unknown> | null;
  rationale: string;
}

export interface GoldStandard {
  domain: string;
  goalDescription: string;
  questions: GoldStandardQuestion[];
  simulatedBatch1Answers: PriorBatchContext;
}

export const GOLD_STANDARDS: GoldStandard[] = [
  WEIGHT_LOSS_STANDARD,
  CAREER_PIVOT_STANDARD,
  LANGUAGE_LEARNING_STANDARD,
  SAVING_MONEY_STANDARD,
  DATING_STANDARD,
];
