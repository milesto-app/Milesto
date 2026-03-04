import { QUALITY_SCORE_DIMENSIONS } from './constants/intake.constants.js';

interface QualityScores {
  relevance: number;
  depth_progression: number;
  dimension_coverage: number;
  redundancy_avoidance: number;
}

export type { QualityScores };

interface QualityPromptParams {
  questions: Array<{ question_text: string; question_type: string }>;
  goalDescription: string;
  batchNumber: number;
  priorQuestions: Array<{ question_text: string; batch_number: number }>;
}

export function buildQualityUserPrompt(params: QualityPromptParams): string {
  const { questions, goalDescription, batchNumber, priorQuestions } = params;
  const currentBatch = questions
    .map((q, i) => `${String(i + 1)}. [${q.question_type}] ${q.question_text}`)
    .join('\n');

  const priorSection =
    priorQuestions.length > 0
      ? `## Prior Batch Questions\n${priorQuestions.map((q) => `- [Batch ${String(q.batch_number)}] ${q.question_text}`).join('\n')}`
      : '## Prior Batch Questions\nNone (this is the first batch)';

  return `## Goal Description\n${goalDescription}\n\n## Current Batch (Batch ${String(batchNumber)})\n${currentBatch}\n\n${priorSection}\n\nScore this batch.`;
}

export function computeComposite(
  scores: QualityScores,
): QualityScores & { composite: number } {
  const clamp = (v: number): number => Math.max(0, Math.min(1, v));
  const relevance = clamp(scores.relevance);
  const depthProgression = clamp(scores.depth_progression);
  const dimensionCoverage = clamp(scores.dimension_coverage);
  const redundancyAvoidance = clamp(scores.redundancy_avoidance);
  const composite =
    (relevance + depthProgression + dimensionCoverage + redundancyAvoidance) /
    QUALITY_SCORE_DIMENSIONS;
  return {
    relevance,
    depth_progression: depthProgression,
    dimension_coverage: dimensionCoverage,
    redundancy_avoidance: redundancyAvoidance,
    composite,
  };
}
