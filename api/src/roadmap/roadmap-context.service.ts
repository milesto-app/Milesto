import { Injectable, Logger } from "@nestjs/common";

import { AiService } from "../ai/ai.service.js";
import { config } from "../config/app.config.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import { RerankService } from "./rerank.service.js";
import type {
  AssembledContext,
  ChunkRetrievalLog,
  ContextChunk,
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

@Injectable()
export class RoadmapContextService {
  private readonly logger = new Logger(RoadmapContextService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly supabaseService: SupabaseService,
    private readonly rerankService: RerankService,
  ) {}

  public async assembleContext(
    goalId: string,
    userId: string,
  ): Promise<AssembledContext> {
    const startTime = Date.now();
    const queryText = await this.buildQueryText(goalId);
    if (queryText.length === 0) {
      throw new Error(
        `No query text available for goal ${goalId}: neither goal profile nor goal data found`,
      );
    }
    const queryEmbedding = await this.aiService.generateEmbedding(queryText);
    const retrieval = await this.retrieveChunks(queryEmbedding, goalId, userId);
    const rerankResult = await this.rerankService.rerank(
      queryText,
      retrieval.chunks,
    );
    const { tier, fallbackReason } = this.determineTier(
      retrieval,
      rerankResult,
    );

    this.logRetrievalObservability({
      allCandidates: rerankResult.allCandidates,
      selected: rerankResult.selected,
      tier,
      fallbackReason,
      goalId,
      latencyMs: Date.now() - startTime,
    });

    return assemblePromptSections(rerankResult.selected);
  }

  private determineTier(
    retrieval: { usedSqlFallback: boolean; fallbackReason?: string },
    rerankResult: { rerankApplied: boolean; failureReason?: string },
  ): { tier: RetrievalTier; fallbackReason: string | undefined } {
    if (retrieval.usedSqlFallback) {
      return { tier: "sql_fallback", fallbackReason: retrieval.fallbackReason };
    }
    if (rerankResult.rerankApplied) {
      return { tier: "hnsw_reranked", fallbackReason: undefined };
    }
    return { tier: "hnsw_only", fallbackReason: rerankResult.failureReason };
  }

  private async buildQueryText(goalId: string): Promise<string> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: profile } = (await supabase
      .from("goals")
      .select("narrative_summary")
      .eq("id", goalId)
      .single()) as { data: { narrative_summary: string | null } | null };

    if (
      typeof profile?.narrative_summary === "string" &&
      profile.narrative_summary.length > 0
    ) {
      return profile.narrative_summary;
    }

    const { data: goal } = (await supabase
      .from("goals")
      .select("title, description")
      .eq("id", goalId)
      .is("deleted_at", null)
      .single()) as { data: { title: string; description: string } | null };

    return `${goal?.title ?? ""} ${goal?.description ?? ""}`.trim();
  }

  private async retrieveChunks(
    queryEmbedding: number[],
    goalId: string,
    userId: string,
  ): Promise<{
    chunks: ContextChunk[];
    usedSqlFallback: boolean;
    fallbackReason?: string;
  }> {
    try {
      return await this.hnswRetrieve(queryEmbedding, goalId, userId);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `HNSW retrieval failed, falling back to SQL context stuffing: ${reason}`,
      );
      const chunks = await this.sqlContextStuffing(goalId, userId);
      return { chunks, usedSqlFallback: true, fallbackReason: reason };
    }
  }

  private async hnswRetrieve(
    queryEmbedding: number[],
    goalId: string,
    userId: string,
  ): Promise<{ chunks: ContextChunk[]; usedSqlFallback: boolean }> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase.rpc("match_goal_context", {
      query_embedding: JSON.stringify(queryEmbedding),
      p_goal_id: goalId,
      p_user_id: userId,
      p_content_types: undefined as unknown as string[],
      match_threshold: config.roadmap.matchThreshold,
      match_count: config.roadmap.matchCount,
    });
    if (error) {
      throw error;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const rows = (data ?? []) as Array<{
      id: string;
      content_text: string;
      content_type: string;
      similarity: number;
      metadata: Record<string, unknown>;
    }>;
    return {
      chunks: rows.map((row) => ({
        id: row.id,
        content_text: row.content_text,
        content_type: row.content_type,
        similarity: row.similarity,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        metadata: row.metadata ?? {},
      })),
      usedSqlFallback: false,
    };
  }

  private async sqlContextStuffing(
    goalId: string,
    userId: string,
  ): Promise<ContextChunk[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("context_embeddings")
      .select("id, content_text, content_type, metadata")
      .eq("user_id", userId)
      .or(`goal_id.eq.${goalId},goal_id.is.null`)
      .order("created_at", { ascending: false });
    if (error) {
      throw error;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return (data ?? []).map((row) => ({
      id: row.id,
      content_text: row.content_text,
      content_type: row.content_type,
      similarity: 0,
      metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    }));
  }

  private logRetrievalObservability(params: ObservabilityParams): void {
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
      this.logger.debug(JSON.stringify(chunkLog));
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
    this.logger.log(`Retrieval complete: ${JSON.stringify(summary)}`);
  }
}

function assemblePromptSections(chunks: RankedChunk[]): AssembledContext {
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
