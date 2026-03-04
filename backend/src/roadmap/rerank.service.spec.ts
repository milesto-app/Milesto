/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-conversion */
import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { config } from '../config/app.config.js';
import { RerankService } from './rerank.service.js';
import type { ContextChunk } from './types/context.types.js';

describe('RerankService', () => {
  let service: RerankService;
  let fetchSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  const mockChunks: ContextChunk[] = [
    {
      id: 'chunk-1',
      content_text: 'Goal profile text',
      content_type: 'goal_profile',
      similarity: 0.9,
      metadata: {},
    },
    {
      id: 'chunk-2',
      content_text: 'Intake answer text',
      content_type: 'intake_answer',
      similarity: 0.85,
      metadata: {},
    },
    {
      id: 'chunk-3',
      content_text: 'User profile text',
      content_type: 'user_profile',
      similarity: 0.8,
      metadata: {},
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RerankService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-cohere-api-key'),
          },
        },
      ],
    }).compile();

    service = module.get<RerankService>(RerankService);
    fetchSpy = jest.spyOn(globalThis, 'fetch');
    warnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('should return RerankResult with selected (top-N) and allCandidates (all with scores), rerankApplied: true', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        Promise.resolve({
          results: [
            { index: 2, relevance_score: 0.95 },
            { index: 0, relevance_score: 0.88 },
            { index: 1, relevance_score: 0.72 },
          ],
        }),
    });

    const result = await service.rerank('test query', mockChunks);

    expect(result.rerankApplied).toBe(true);
    expect(result.allCandidates).toHaveLength(3);
    // allCandidates sorted by rerank_score descending
    expect(result.allCandidates[0]).toEqual({
      ...mockChunks[2],
      rerank_score: 0.95,
    });
    expect(result.allCandidates[1]).toEqual({
      ...mockChunks[0],
      rerank_score: 0.88,
    });
    expect(result.allCandidates[2]).toEqual({
      ...mockChunks[1],
      rerank_score: 0.72,
    });
    // selected is top-N from allCandidates
    expect(result.selected.length).toBeLessThanOrEqual(
      config.roadmap.rerankTopN,
    );
    expect(result.selected).toEqual(
      result.allCandidates.slice(0, config.roadmap.rerankTopN),
    );
    expect(result.failureReason).toBeUndefined();
  });

  it('should request all scores from Cohere (top_n: chunks.length) and use apiVersion in URL', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        Promise.resolve({
          results: [{ index: 0, relevance_score: 0.9 }],
        }),
    });

    const firstChunk = mockChunks[0]!;
    await service.rerank('my query', [firstChunk]);

    expect(fetchSpy).toHaveBeenCalledWith(
      `https://api.cohere.com/v${String(config.cohere.apiVersion)}/rerank`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-cohere-api-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.cohere.model,
          query: 'my query',
          documents: [firstChunk.content_text],
          top_n: 1,
          return_documents: false,
        }),
      }),
    );
  });

  it('should return all as selected with rerankApplied: false when Cohere returns error status', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    const result = await service.rerank('test query', mockChunks);

    expect(result.rerankApplied).toBe(false);
    expect(result.selected).toHaveLength(3);
    expect(result.allCandidates).toHaveLength(3);
    expect(result.selected[0]).toEqual(mockChunks[0]);
    expect(result.selected).toEqual(result.allCandidates);
    expect(result.failureReason).toBe('Cohere API error: 429');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Rerank failed'),
    );
  });

  it('should return all as selected with rerankApplied: false when Cohere is unavailable (network error)', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await service.rerank('test query', mockChunks);

    expect(result.rerankApplied).toBe(false);
    expect(result.selected).toHaveLength(3);
    expect(result.allCandidates).toHaveLength(3);
    expect(result.selected[0]).toEqual(mockChunks[0]);
    expect(result.failureReason).toBe('ECONNREFUSED');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('ECONNREFUSED'),
    );
  });

  it('should return all as selected with rerankApplied: false on timeout (AbortController)', async () => {
    fetchSpy.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

    const result = await service.rerank('test query', mockChunks);

    expect(result.rerankApplied).toBe(false);
    expect(result.selected).toHaveLength(3);
    expect(result.allCandidates).toHaveLength(3);
    expect(result.selected[0]).toEqual(mockChunks[0]);
    expect(result.failureReason).toContain('Aborted');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Rerank failed'),
    );
  });

  it('should return empty RerankResult for empty chunks input without calling API', async () => {
    const result = await service.rerank('test query', []);

    expect(result).toEqual({
      selected: [],
      allCandidates: [],
      rerankApplied: false,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should return all as selected with rerankApplied: false when COHERE_API_KEY is not configured', async () => {
    // Create service without API key
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RerankService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    const serviceNoKey = module.get<RerankService>(RerankService);
    const noKeyWarnSpy = jest
      .spyOn(serviceNoKey['logger'], 'warn')
      .mockImplementation();

    const result = await serviceNoKey.rerank('test query', mockChunks);

    expect(result.rerankApplied).toBe(false);
    expect(result.selected).toHaveLength(3);
    expect(result.allCandidates).toHaveLength(3);
    expect(result.selected[0]).toEqual(mockChunks[0]);
    expect(result.selected).toEqual(result.allCandidates);
    expect(result.failureReason).toBe('COHERE_API_KEY not configured');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(noKeyWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('COHERE_API_KEY not configured'),
    );

    noKeyWarnSpy.mockRestore();
  });
});
