import type { BatchEvalResult, EvalQuestion } from './eval.types.js';

export interface RawQuestion {
  question_text: string;
  question_type: string;
  config: Record<string, unknown> | null;
}

export function mapToEvalQuestions(questions: RawQuestion[]): EvalQuestion[] {
  return questions.map((q) => ({
    question_text: q.question_text,
    question_type: q.question_type,
    config: q.config,
  }));
}

export function computeDeltas(
  goldBatch: BatchEvalResult,
  aiBatches: BatchEvalResult[],
  universalBatch: BatchEvalResult,
): Record<string, number> {
  const delta: Record<string, number> = {};
  const axes = Object.keys(goldBatch.compositeByAxis);
  const sourceBatches = aiBatches.length > 0 ? aiBatches : [universalBatch];

  for (const axis of axes) {
    const sourceAvg =
      sourceBatches.reduce((sum, b) => sum + (b.compositeByAxis[axis] ?? 0), 0) /
      sourceBatches.length;
    delta[axis] = sourceAvg - (goldBatch.compositeByAxis[axis] ?? 0);
  }

  return delta;
}
