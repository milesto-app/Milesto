import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { RerankService } from '../roadmap/rerank.service.js';
import { appConfig } from '../config/app.config.js';
import type { ContextChunk } from '../roadmap/types/context.types.js';

export interface SearchResult {
  content_type: string;
  content_text: string;
  similarity: number;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  totalFound: number;
}

export interface SearchParams {
  query: string;
  goalId: string;
  userId: string;
  contentTypes?: string[] | undefined;
}

export interface SaveInsightParams {
  insight: string;
  goalId: string;
  userId: string;
}

export interface SaveInsightResult {
  saved: boolean;
  reason?: string | undefined;
}

interface MatchRow {
  id: string;
  content_text: string;
  content_type: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

interface FetchParams {
  queryEmbedding: number[];
  goalId: string;
  userId: string;
  contentTypes?: string[] | undefined;
}

@Injectable()
export class ChatSearchService {
  private readonly logger = new Logger(ChatSearchService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly supabaseService: SupabaseService,
    private readonly rerankService: RerankService,
  ) {}

  public async saveInsight(params: SaveInsightParams): Promise<SaveInsightResult> {
    const embedding = await this.aiService.generateEmbedding(params.insight);
    const isDuplicate = await this.checkDuplicateInsight(embedding, params);

    if (isDuplicate) {
      this.logger.log(`Duplicate insight detected for goal ${params.goalId}, skipping`);
      return { saved: false, reason: 'A very similar insight already exists.' };
    }

    await this.insertInsight(params, embedding);
    this.logger.log(`Insight saved for goal ${params.goalId}`);
    return { saved: true };
  }

  public async search(params: SearchParams): Promise<SearchResponse> {
    const { query, goalId, userId, contentTypes } = params;
    const queryEmbedding = await this.aiService.generateEmbedding(query);
    const chunks = await this.fetchMatchingChunks({ queryEmbedding, goalId, userId, contentTypes });

    if (chunks.length === 0) {
      this.logger.log(`No matching chunks found for query: "${query}"`);
      return { results: [], query, totalFound: 0 };
    }

    const rerankResult = await this.rerankService.rerank(query, chunks);
    const topResults = rerankResult.allCandidates
      .slice(0, appConfig.chat.searchResultCount)
      .map((chunk) => ({
        content_type: chunk.content_type,
        content_text: chunk.content_text,
        similarity: chunk.rerank_score ?? chunk.similarity,
      }));

    this.logger.log(
      `Search completed: ${topResults.length}/${rerankResult.allCandidates.length} results for "${query}"`,
    );

    return { results: topResults, query, totalFound: rerankResult.allCandidates.length };
  }

  private async fetchMatchingChunks(params: FetchParams): Promise<ContextChunk[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase.rpc('match_goal_context', {
      query_embedding: JSON.stringify(params.queryEmbedding),
      p_goal_id: params.goalId,
      p_user_id: params.userId,
      p_content_types: params.contentTypes ?? (undefined as unknown as string[]),
      match_threshold: appConfig.chat.searchMatchThreshold,
      match_count: appConfig.chat.searchMatchCount,
    });

    if (error !== null) {
      this.logger.error(`match_goal_context RPC failed: ${error.message}`);
      throw error;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return ((data ?? []) as MatchRow[]).map((row) => ({
      id: row.id,
      content_text: row.content_text,
      content_type: row.content_type,
      similarity: row.similarity,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      metadata: row.metadata ?? {},
    }));
  }

  private async checkDuplicateInsight(
    embedding: number[],
    params: SaveInsightParams,
  ): Promise<boolean> {
    try {
      const supabase = this.supabaseService.getAdminClient();
      const { data, error } = await supabase.rpc('match_goal_context', {
        query_embedding: JSON.stringify(embedding),
        p_goal_id: params.goalId,
        p_user_id: params.userId,
        p_content_types: ['coach_insight'],
        match_threshold: appConfig.chat.insightDuplicateThreshold,
        match_count: appConfig.chat.insightDuplicateCheckCount,
      });

      if (error !== null) {
        this.logger.warn(`Duplicate check failed, allowing insert: ${error.message}`);
        return false;
      }

      return ((data ?? []) as MatchRow[]).length > 0;
    } catch (error) {
      this.logger.warn(
        `Duplicate check error, allowing insert: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  private async insertInsight(params: SaveInsightParams, embedding: number[]): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase.from('context_embeddings').insert({
      goal_id: params.goalId,
      user_id: params.userId,
      content_type: 'coach_insight',
      content_text: params.insight,
      embedding: JSON.stringify(embedding),
    });

    if (error !== null) {
      this.logger.error(`Failed to insert insight: ${error.message}`);
      throw error;
    }
  }
}
