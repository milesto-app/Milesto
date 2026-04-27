import type { Logger } from "@nestjs/common";

import type {
  AssembledContext,
  ChunkRetrievalLog,
  RankedChunk,
  RetrievalSummaryLog,
  RetrievalTier,
} from "./types/context.types.js";

interface ObservabilityParams {
  allCandidates: RankedChunk[];
  selected: RankedChunk[];
  tier: RetrievalTier;
  fallbackReason: string | undefined;
  goalId: string;
  latencyMs: number;
}

export function assemblePromptSections(
  chunks: RankedChunk[],
): AssembledContext {
  const byScore = (a: RankedChunk, b: RankedChunk): number =>
    (b.rerank_score ?? 0) - (a.rerank_score ?? 0);
  const goalProfile = chunks
    .filter((c) => c.content_type === "goal_profile")
    .sort(byScore);
  const intakeAnswers = chunks
    .filter((c) => c.content_type === "intake_answer")
    .sort(byScore);
  const userProfile = chunks
    .filter((c) => c.content_type === "user_profile")
    .sort(byScore);
  const weeklySummaries = chunks
    .filter((c) => c.content_type === "weekly_summary")
    .sort(byScore);
  const debriefNotes = chunks
    .filter((c) => c.content_type === "debrief_note")
    .sort(byScore);
  return {
    goalProfileSection: goalProfile.map((c) => c.content_text).join("\n\n"),
    intakeSection: intakeAnswers.map((c) => c.content_text).join("\n\n"),
    userProfileSection: userProfile.map((c) => c.content_text).join("\n\n"),
    progressSection: weeklySummaries.map((c) => c.content_text).join("\n\n"),
    debriefSection: debriefNotes.map((c) => c.content_text).join("\n\n"),
    totalChunks: chunks.length,
  };
}

export function logRetrievalObservability(
  logger: Logger,
  params: ObservabilityParams,
): void {
  const selectedIds = new Set(params.selected.map((c) => c.id));
  for (const chunk of params.allCandidates) {
    const chunkLog: ChunkRetrievalLog = {
      chunk_id: chunk.id,
      content_type: chunk.content_type,
      similarity_score:
        params.tier === "sql_fallback" ? null : chunk.similarity,
      rerank_score:
        params.tier === "sql_fallback" ? null : (chunk.rerank_score ?? null),
      selected: selectedIds.has(chunk.id),
    };
    if (!chunkLog.selected) {
      chunkLog.exclusion_reason = "below_rerank_cutoff";
    }
    logger.debug(JSON.stringify(chunkLog));
  }
  const summary: RetrievalSummaryLog = {
    goal_id: params.goalId,
    tier: params.tier,
    total_candidates: params.allCandidates.length,
    selected_count: params.selected.length,
    excluded_count: params.allCandidates.length - params.selected.length,
    ...(params.fallbackReason !== undefined
      ? { fallback_reason: params.fallbackReason }
      : {}),
    latency_ms: params.latencyMs,
  };
  logger.log(`Retrieval complete: ${JSON.stringify(summary)}`);
}
