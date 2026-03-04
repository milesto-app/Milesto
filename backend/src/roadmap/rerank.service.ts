import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { config } from '../config/app.config.js';
import type {
  ContextChunk,
  RankedChunk,
  RerankResult,
} from './types/context.types.js';

const RERANK_TIMEOUT_MS = 10_000;

interface CohereRerankResult {
  index: number;
  relevance_score: number;
}

@Injectable()
export class RerankService {
  private readonly logger = new Logger(RerankService.name);
  private readonly cohereApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.cohereApiKey = this.configService.get<string>('COHERE_API_KEY') ?? '';
  }

  public async rerank(
    query: string,
    chunks: ContextChunk[],
  ): Promise<RerankResult> {
    if (chunks.length === 0) {
      return { selected: [], allCandidates: [], rerankApplied: false };
    }

    if (this.cohereApiKey.length === 0) {
      this.logger.warn('COHERE_API_KEY not configured, skipping rerank');
      return this.buildFallbackResult(chunks, 'COHERE_API_KEY not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, RERANK_TIMEOUT_MS);

    try {
      return await this.callCohereApi(query, chunks, controller.signal);
    } catch (error) {
      const failureReason =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Rerank failed, using raw HNSW results: ${failureReason}`,
      );
      return this.buildFallbackResult(chunks, failureReason);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async callCohereApi(
    query: string,
    chunks: ContextChunk[],
    signal: AbortSignal,
  ): Promise<RerankResult> {
    const url = `https://api.cohere.com/v${config.cohere.apiVersion}/rerank`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.cohereApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.cohere.model,
        query,
        documents: chunks.map((c) => c.content_text),
        top_n: chunks.length,
        return_documents: false,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${String(response.status)}`);
    }

    const result = (await response.json()) as { results: CohereRerankResult[] };
    const allCandidates: RankedChunk[] = result.results
      .filter((r) => chunks[r.index] !== undefined)
      .map((r) => ({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ...chunks[r.index]!,
        rerank_score: r.relevance_score,
      }))
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      .sort((a, b) => (b.rerank_score ?? 0) - (a.rerank_score ?? 0));

    const selected = allCandidates.slice(0, config.roadmap.rerankTopN);
    return { selected, allCandidates, rerankApplied: true };
  }

  private buildFallbackResult(
    chunks: ContextChunk[],
    failureReason: string,
  ): RerankResult {
    const allAsSelected: RankedChunk[] = chunks.map((c) => ({ ...c }));
    return {
      selected: allAsSelected,
      allCandidates: allAsSelected,
      rerankApplied: false,
      failureReason,
    };
  }
}
