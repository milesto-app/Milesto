export interface ContextChunk {
  id: string;
  content_text: string;
  content_type: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface RankedChunk extends ContextChunk {
  rerank_score?: number;
}

export interface AssembledContext {
  goalProfileSection: string;
  intakeSection: string;
  userProfileSection: string;
  progressSection: string;
  debriefSection: string;
  totalChunks: number;
}

export type RetrievalTier = 'hnsw_reranked' | 'hnsw_only' | 'sql_fallback';

export interface ChunkRetrievalLog {
  chunk_id: string;
  content_type: string;
  similarity_score: number | null;
  rerank_score?: number | null;
  selected: boolean;
  exclusion_reason?: string;
}

export interface RetrievalSummaryLog {
  goal_id: string;
  tier: RetrievalTier;
  total_candidates: number;
  selected_count: number;
  excluded_count: number;
  fallback_reason?: string;
  latency_ms: number;
}

export interface RerankResult {
  selected: RankedChunk[];
  allCandidates: RankedChunk[];
  rerankApplied: boolean;
  failureReason?: string;
}
