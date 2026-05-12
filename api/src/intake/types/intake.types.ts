import type { PriorBatchContext } from "../../config/questions.config.js";

export interface AnswerInput {
  question_id: string;
  answer_text?: string;
  answer_numeric?: number;
  selected_options?: string[];
}

export interface ProfileResult {
  profile_id: string | null;
  profile_status: string;
}

export interface StoreProfileParams {
  userId: string;
  goalId: string;
  goalDescription: string;
  language: string;
}

export interface BatchParams {
  userId: string;
  goalId: string;
  goalDescription: string;
  nextBatchNumber: number;
  language: string;
}

export interface ProfileGenParams {
  userId: string;
  goalId: string;
  goalDescription: string;
  priorBatches: PriorBatchContext[];
  language: string;
}
