/* eslint-disable max-lines, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ContextPipelineService } from './context-pipeline.service.js';
import { AiService } from '../ai/ai.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { RerankService } from './rerank.service.js';
import type { ContextChunk, RankedChunk, RerankResult } from './types/context.types.js';

describe('ContextPipelineService', () => {
  let service: ContextPipelineService;
  let mockAiService: { generateEmbedding: jest.Mock };
  let mockRerankService: { rerank: jest.Mock };
  let mockSupabase: { rpc: jest.Mock; from: jest.Mock };

  const userId = 'user-123';
  const goalId = 'goal-456';
  const fakeEmbedding = [0.1, 0.2, 0.3];

  const mockChunks: ContextChunk[] = [
    {
      id: 'c1',
      content_text: 'My goal profile narrative',
      content_type: 'goal_profile',
      similarity: 0.95,
      metadata: {},
    },
    {
      id: 'c2',
      content_text: 'My intake answer about motivation',
      content_type: 'intake_answer',
      similarity: 0.9,
      metadata: {},
    },
    {
      id: 'c3',
      content_text: 'Cross-goal user profile data',
      content_type: 'user_profile',
      similarity: 0.85,
      metadata: {},
    },
    {
      id: 'c4',
      content_text: 'Weekly progress summary',
      content_type: 'weekly_summary',
      similarity: 0.8,
      metadata: {},
    },
    {
      id: 'c5',
      content_text: 'Debrief notes from session',
      content_type: 'debrief_note',
      similarity: 0.75,
      metadata: {},
    },
  ];

  const mockRankedChunks: RankedChunk[] = mockChunks.map((c, i) => ({
    ...c,
    rerank_score: 0.99 - i * 0.05,
  }));

  const defaultRerankResult: RerankResult = {
    selected: mockRankedChunks,
    allCandidates: mockRankedChunks,
    rerankApplied: true,
  };

  // Helper to set up the from() chain for goal_profiles query
  function setupGoalProfileQuery(profileData: { narrative_summary: string } | null): {
    select: jest.Mock;
    eq: jest.Mock;
    single: jest.Mock;
  } {
    const singleMock = jest.fn().mockResolvedValue({ data: profileData, error: null });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    return { select: selectMock, eq: eqMock, single: singleMock };
  }

  // Helper to set up the from() chain for goals query
  function setupGoalQuery(
    goalData: {
      title: string;
      description: string;
    } | null,
  ): { select: jest.Mock; eq: jest.Mock; single: jest.Mock } {
    const singleMock = jest.fn().mockResolvedValue({ data: goalData, error: null });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    return { select: selectMock, eq: eqMock, single: singleMock };
  }

  // Helper to set up the from() chain for SQL context stuffing
  function setupSqlContextStuffingQuery(
    data: Array<{
      id: string;
      content_text: string;
      content_type: string;
      metadata: Record<string, unknown>;
    }> | null,
    error: Error | null = null,
  ): { select: jest.Mock; eq: jest.Mock; or: jest.Mock; order: jest.Mock } {
    const orderMock = jest.fn().mockResolvedValue({ data, error });
    const orMock = jest.fn().mockReturnValue({ order: orderMock });
    const eqMock = jest.fn().mockReturnValue({ or: orMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    return { select: selectMock, eq: eqMock, or: orMock, order: orderMock };
  }

  beforeEach(async () => {
    mockAiService = {
      generateEmbedding: jest.fn().mockResolvedValue(fakeEmbedding),
    };

    mockRerankService = {
      rerank: jest.fn().mockResolvedValue(defaultRerankResult),
    };

    mockSupabase = {
      rpc: jest.fn(),
      from: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextPipelineService,
        { provide: AiService, useValue: mockAiService },
        {
          provide: SupabaseService,
          useValue: { getAdminClient: () => mockSupabase },
        },
        { provide: RerankService, useValue: mockRerankService },
      ],
    }).compile();

    service = module.get<ContextPipelineService>(ContextPipelineService);
  });

  it('should assemble context via full happy path (embed -> HNSW -> rerank -> assemble)', async () => {
    // Setup goal_profiles query for buildQueryText
    const profileChain = setupGoalProfileQuery({
      narrative_summary: 'Run a marathon in 6 months',
    });
    mockSupabase.from.mockReturnValueOnce(profileChain);

    // Setup HNSW RPC success
    mockSupabase.rpc.mockResolvedValueOnce({
      data: mockChunks,
      error: null,
    });

    const result = await service.assembleContext(goalId, userId);

    // Verify embedding was generated from goal profile narrative
    expect(mockAiService.generateEmbedding).toHaveBeenCalledWith('Run a marathon in 6 months');

    // Verify HNSW RPC was called
    expect(mockSupabase.rpc).toHaveBeenCalledWith('match_goal_context', {
      query_embedding: JSON.stringify(fakeEmbedding),
      p_goal_id: goalId,
      p_user_id: userId,
      p_content_types: undefined,
      match_threshold: 0.7,
      match_count: 20,
    });

    // Verify rerank was called
    expect(mockRerankService.rerank).toHaveBeenCalledWith('Run a marathon in 6 months', mockChunks);

    // Verify assembled context has all sections
    expect(result.goalProfileSection).toBe('My goal profile narrative');
    expect(result.intakeSection).toBe('My intake answer about motivation');
    expect(result.userProfileSection).toBe('Cross-goal user profile data');
    expect(result.progressSection).toBe('Weekly progress summary');
    expect(result.debriefSection).toBe('Debrief notes from session');
    expect(result.totalChunks).toBe(5);
  });

  it('should group chunks correctly by content_type and sort by rerank score', async () => {
    const profileChain = setupGoalProfileQuery({
      narrative_summary: 'Test goal',
    });
    mockSupabase.from.mockReturnValueOnce(profileChain);

    // Return chunks of same type with different rerank scores to test sorting
    const duplicateChunks: ContextChunk[] = [
      {
        id: 'c1',
        content_text: 'Answer 1',
        content_type: 'intake_answer',
        similarity: 0.9,
        metadata: {},
      },
      {
        id: 'c2',
        content_text: 'Answer 2',
        content_type: 'intake_answer',
        similarity: 0.85,
        metadata: {},
      },
    ];

    // Answer 2 has higher rerank score -- should appear first after sorting
    const rankedDuplicates: RankedChunk[] = [
      { ...duplicateChunks[0]!, rerank_score: 0.7 },
      { ...duplicateChunks[1]!, rerank_score: 0.95 },
    ];

    mockSupabase.rpc.mockResolvedValueOnce({
      data: duplicateChunks,
      error: null,
    });
    mockRerankService.rerank.mockResolvedValueOnce({
      selected: rankedDuplicates,
      allCandidates: rankedDuplicates,
      rerankApplied: true,
    } as RerankResult);

    const result = await service.assembleContext(goalId, userId);

    expect(result.intakeSection).toBe('Answer 2\n\nAnswer 1');
    expect(result.goalProfileSection).toBe('');
    expect(result.totalChunks).toBe(2);
  });

  it('should fall back to SQL context stuffing when HNSW fails and log warn (Tier 2)', async () => {
    const warnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

    const profileChain = setupGoalProfileQuery({
      narrative_summary: 'Test goal',
    });
    mockSupabase.from.mockReturnValueOnce(profileChain);

    // HNSW RPC fails
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('RPC function timeout'),
    });

    // SQL fallback succeeds
    const sqlChain = setupSqlContextStuffingQuery([
      {
        id: 'sql-1',
        content_text: 'Fallback content',
        content_type: 'goal_profile',
        metadata: {},
      },
    ]);
    mockSupabase.from.mockReturnValueOnce(sqlChain);

    const sqlRanked: RankedChunk[] = [
      {
        id: 'sql-1',
        content_text: 'Fallback content',
        content_type: 'goal_profile',
        similarity: 0,
        metadata: {},
        rerank_score: 0.8,
      },
    ];
    mockRerankService.rerank.mockResolvedValueOnce({
      selected: sqlRanked,
      allCandidates: sqlRanked,
      rerankApplied: true,
    } as RerankResult);

    const result = await service.assembleContext(goalId, userId);

    expect(result.goalProfileSection).toBe('Fallback content');
    expect(result.totalChunks).toBe(1);

    // Verify warn logging for HNSW fallback
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('HNSW retrieval failed'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('RPC function timeout'));

    // Verify SQL fallback query used correct filters
    expect(sqlChain.select).toHaveBeenCalledWith('id, content_text, content_type, metadata');
    expect(sqlChain.eq).toHaveBeenCalledWith('user_id', userId);
    expect(sqlChain.or).toHaveBeenCalledWith(`goal_id.eq.${goalId},goal_id.is.null`);
    expect(sqlChain.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });

    warnSpy.mockRestore();
  });

  it('should throw error when both HNSW and SQL fallback fail (Tier 3)', async () => {
    const profileChain = setupGoalProfileQuery({
      narrative_summary: 'Test goal',
    });
    mockSupabase.from.mockReturnValueOnce(profileChain);

    // HNSW fails
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('RPC failed'),
    });

    // SQL fallback also fails
    const sqlChain = setupSqlContextStuffingQuery(null, new Error('SQL query failed'));
    mockSupabase.from.mockReturnValueOnce(sqlChain);

    await expect(service.assembleContext(goalId, userId)).rejects.toThrow('SQL query failed');
  });

  it('should include cross-goal chunks (goal_id IS NULL) via user_profile content type', async () => {
    const profileChain = setupGoalProfileQuery({
      narrative_summary: 'Test goal',
    });
    mockSupabase.from.mockReturnValueOnce(profileChain);

    // Chunks include a user_profile with no goal_id (cross-goal)
    const chunksWithCrossGoal: ContextChunk[] = [
      {
        id: 'c1',
        content_text: 'Goal specific data',
        content_type: 'goal_profile',
        similarity: 0.9,
        metadata: {},
      },
      {
        id: 'c2',
        content_text: 'Cross-goal user preferences',
        content_type: 'user_profile',
        similarity: 0.8,
        metadata: {},
      },
    ];

    mockSupabase.rpc.mockResolvedValueOnce({
      data: chunksWithCrossGoal,
      error: null,
    });

    const rankedCross: RankedChunk[] = chunksWithCrossGoal.map((c) => ({
      ...c,
      rerank_score: 0.9,
    }));
    mockRerankService.rerank.mockResolvedValueOnce({
      selected: rankedCross,
      allCandidates: rankedCross,
      rerankApplied: true,
    } as RerankResult);

    const result = await service.assembleContext(goalId, userId);

    expect(result.userProfileSection).toBe('Cross-goal user preferences');
    expect(result.goalProfileSection).toBe('Goal specific data');
  });

  it('should return empty sections when no embeddings are found', async () => {
    const profileChain = setupGoalProfileQuery({
      narrative_summary: 'Test goal',
    });
    mockSupabase.from.mockReturnValueOnce(profileChain);

    // HNSW returns empty
    mockSupabase.rpc.mockResolvedValueOnce({ data: [], error: null });
    mockRerankService.rerank.mockResolvedValueOnce({
      selected: [],
      allCandidates: [],
      rerankApplied: false,
    } as RerankResult);

    const result = await service.assembleContext(goalId, userId);

    expect(result.goalProfileSection).toBe('');
    expect(result.intakeSection).toBe('');
    expect(result.userProfileSection).toBe('');
    expect(result.progressSection).toBe('');
    expect(result.debriefSection).toBe('');
    expect(result.totalChunks).toBe(0);
  });

  it('should fall back to goal title+description when no goal profile exists', async () => {
    // No goal profile
    const profileChain = setupGoalProfileQuery(null);
    mockSupabase.from.mockReturnValueOnce(profileChain);

    // Goal fallback
    const goalChain = setupGoalQuery({
      title: 'Marathon Goal',
      description: 'Run a full marathon',
    });
    mockSupabase.from.mockReturnValueOnce(goalChain);

    mockSupabase.rpc.mockResolvedValueOnce({ data: [], error: null });
    mockRerankService.rerank.mockResolvedValueOnce({
      selected: [],
      allCandidates: [],
      rerankApplied: false,
    } as RerankResult);

    await service.assembleContext(goalId, userId);

    expect(mockAiService.generateEmbedding).toHaveBeenCalledWith(
      'Marathon Goal Run a full marathon',
    );
  });

  it('should throw when no query text is available (no profile and no goal)', async () => {
    // No goal profile
    const profileChain = setupGoalProfileQuery(null);
    mockSupabase.from.mockReturnValueOnce(profileChain);

    // No goal either
    const goalChain = setupGoalQuery(null);
    mockSupabase.from.mockReturnValueOnce(goalChain);

    await expect(service.assembleContext(goalId, userId)).rejects.toThrow(
      `No query text available for goal ${goalId}`,
    );
  });

  describe('retrieval observability logging', () => {
    it('should log per-chunk details at debug level with both scores and selection decisions on normal path (hnsw_reranked)', async () => {
      const debugSpy = jest.spyOn(service['logger'], 'debug').mockImplementation();
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

      const profileChain = setupGoalProfileQuery({
        narrative_summary: 'Test goal',
      });
      mockSupabase.from.mockReturnValueOnce(profileChain);

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [mockChunks[0], mockChunks[1]],
        error: null,
      });

      const selected: RankedChunk[] = [{ ...mockChunks[0]!, rerank_score: 0.95 }];
      const excluded: RankedChunk[] = [{ ...mockChunks[1]!, rerank_score: 0.31 }];
      const allCandidates = [...selected, ...excluded];

      mockRerankService.rerank.mockResolvedValueOnce({
        selected,
        allCandidates,
        rerankApplied: true,
      } as RerankResult);

      await service.assembleContext(goalId, userId);

      // Verify debug called for each candidate chunk
      expect(debugSpy).toHaveBeenCalledTimes(2);

      // Selected chunk
      expect(debugSpy).toHaveBeenCalledWith(
        JSON.stringify({
          chunk_id: 'c1',
          content_type: 'goal_profile',
          similarity_score: 0.95,
          rerank_score: 0.95,
          selected: true,
        }),
      );

      // Excluded chunk
      expect(debugSpy).toHaveBeenCalledWith(
        JSON.stringify({
          chunk_id: 'c2',
          content_type: 'intake_answer',
          similarity_score: 0.9,
          rerank_score: 0.31,
          selected: false,
          exclusion_reason: 'below_rerank_cutoff',
        }),
      );

      // Verify summary log
      expect(logSpy).toHaveBeenCalledTimes(1);
      const summaryCall = logSpy.mock.calls[0]![0] as string;
      expect(summaryCall).toContain('Retrieval complete:');
      const summaryJson = JSON.parse(summaryCall.replace('Retrieval complete: ', ''));
      expect(summaryJson.goal_id).toBe(goalId);
      expect(summaryJson.tier).toBe('hnsw_reranked');
      expect(summaryJson.total_candidates).toBe(2);
      expect(summaryJson.selected_count).toBe(1);
      expect(summaryJson.excluded_count).toBe(1);
      expect(summaryJson.latency_ms).toBeGreaterThanOrEqual(0);
      expect(summaryJson.fallback_reason).toBeUndefined();

      debugSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('should log per-chunk with HNSW scores only (no rerank) and summary with tier hnsw_only on rerank fallback', async () => {
      const debugSpy = jest.spyOn(service['logger'], 'debug').mockImplementation();
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

      const profileChain = setupGoalProfileQuery({
        narrative_summary: 'Test goal',
      });
      mockSupabase.from.mockReturnValueOnce(profileChain);

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [mockChunks[0]],
        error: null,
      });

      // Rerank failed: all returned as selected, no rerank scores
      const chunksNoRerank: RankedChunk[] = [{ ...mockChunks[0]! }];
      mockRerankService.rerank.mockResolvedValueOnce({
        selected: chunksNoRerank,
        allCandidates: chunksNoRerank,
        rerankApplied: false,
        failureReason: 'Cohere API error: 503',
      } as RerankResult);

      await service.assembleContext(goalId, userId);

      // Verify debug logs have null rerank_score
      expect(debugSpy).toHaveBeenCalledWith(
        JSON.stringify({
          chunk_id: 'c1',
          content_type: 'goal_profile',
          similarity_score: 0.95,
          rerank_score: null,
          selected: true,
        }),
      );

      // Verify summary with hnsw_only tier and fallback_reason
      const summaryCall = logSpy.mock.calls[0]![0] as string;
      const summaryJson = JSON.parse(summaryCall.replace('Retrieval complete: ', ''));
      expect(summaryJson.tier).toBe('hnsw_only');
      expect(summaryJson.fallback_reason).toBe('Cohere API error: 503');

      debugSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('should log chunks without scores and summary with tier sql_fallback and fallback_reason on SQL fallback', async () => {
      const debugSpy = jest.spyOn(service['logger'], 'debug').mockImplementation();
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation();
      const warnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      const profileChain = setupGoalProfileQuery({
        narrative_summary: 'Test goal',
      });
      mockSupabase.from.mockReturnValueOnce(profileChain);

      // HNSW fails
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: new Error('HNSW search error: connection timeout'),
      });

      // SQL fallback succeeds
      const sqlChain = setupSqlContextStuffingQuery([
        {
          id: 'sql-1',
          content_text: 'Fallback content',
          content_type: 'goal_profile',
          metadata: {},
        },
      ]);
      mockSupabase.from.mockReturnValueOnce(sqlChain);

      const sqlChunks: RankedChunk[] = [
        {
          id: 'sql-1',
          content_text: 'Fallback content',
          content_type: 'goal_profile',
          similarity: 0,
          metadata: {},
        },
      ];
      mockRerankService.rerank.mockResolvedValueOnce({
        selected: sqlChunks,
        allCandidates: sqlChunks,
        rerankApplied: false,
      } as RerankResult);

      await service.assembleContext(goalId, userId);

      // Verify debug logs have null similarity_score and null rerank_score
      expect(debugSpy).toHaveBeenCalledWith(
        JSON.stringify({
          chunk_id: 'sql-1',
          content_type: 'goal_profile',
          similarity_score: null,
          rerank_score: null,
          selected: true,
        }),
      );

      // Verify summary with sql_fallback tier and fallback_reason
      const summaryCall = logSpy.mock.calls[0]![0] as string;
      const summaryJson = JSON.parse(summaryCall.replace('Retrieval complete: ', ''));
      expect(summaryJson.tier).toBe('sql_fallback');
      expect(summaryJson.fallback_reason).toBe('HNSW search error: connection timeout');
      expect(summaryJson.total_candidates).toBe(1);
      expect(summaryJson.selected_count).toBe(1);
      expect(summaryJson.excluded_count).toBe(0);

      debugSpy.mockRestore();
      logSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it('should force rerank_score to null when tier is sql_fallback even if Cohere succeeded', async () => {
      const debugSpy = jest.spyOn(service['logger'], 'debug').mockImplementation();
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation();
      const warnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      const profileChain = setupGoalProfileQuery({
        narrative_summary: 'Test goal',
      });
      mockSupabase.from.mockReturnValueOnce(profileChain);

      // HNSW fails
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: new Error('HNSW connection timeout'),
      });

      // SQL fallback succeeds
      const sqlChain = setupSqlContextStuffingQuery([
        {
          id: 'sql-1',
          content_text: 'Fallback content',
          content_type: 'goal_profile',
          metadata: {},
        },
      ]);
      mockSupabase.from.mockReturnValueOnce(sqlChain);

      // Cohere rerank SUCCEEDS despite HNSW failure
      const sqlChunksWithRerank: RankedChunk[] = [
        {
          id: 'sql-1',
          content_text: 'Fallback content',
          content_type: 'goal_profile',
          similarity: 0,
          metadata: {},
          rerank_score: 0.85,
        },
      ];
      mockRerankService.rerank.mockResolvedValueOnce({
        selected: sqlChunksWithRerank,
        allCandidates: sqlChunksWithRerank,
        rerankApplied: true,
      } as RerankResult);

      await service.assembleContext(goalId, userId);

      // Verify rerank_score forced to null despite Cohere returning 0.85
      expect(debugSpy).toHaveBeenCalledWith(
        JSON.stringify({
          chunk_id: 'sql-1',
          content_type: 'goal_profile',
          similarity_score: null,
          rerank_score: null,
          selected: true,
        }),
      );

      // Verify tier is sql_fallback with fallback_reason
      const summaryCall = logSpy.mock.calls[0]![0] as string;
      const summaryJson = JSON.parse(summaryCall.replace('Retrieval complete: ', ''));
      expect(summaryJson.tier).toBe('sql_fallback');
      expect(summaryJson.fallback_reason).toBe('HNSW connection timeout');

      debugSpy.mockRestore();
      logSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it('should verify logger.debug called for each chunk and logger.log called once for summary', async () => {
      const debugSpy = jest.spyOn(service['logger'], 'debug').mockImplementation();
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

      const profileChain = setupGoalProfileQuery({
        narrative_summary: 'Test goal',
      });
      mockSupabase.from.mockReturnValueOnce(profileChain);

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockChunks,
        error: null,
      });

      // All 5 chunks as candidates, all selected
      mockRerankService.rerank.mockResolvedValueOnce({
        selected: mockRankedChunks,
        allCandidates: mockRankedChunks,
        rerankApplied: true,
      } as RerankResult);

      await service.assembleContext(goalId, userId);

      expect(debugSpy).toHaveBeenCalledTimes(5);
      expect(logSpy).toHaveBeenCalledTimes(1);

      debugSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('should verify latency_ms is a positive number', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation();
      jest.spyOn(service['logger'], 'debug').mockImplementation();

      const profileChain = setupGoalProfileQuery({
        narrative_summary: 'Test goal',
      });
      mockSupabase.from.mockReturnValueOnce(profileChain);

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [mockChunks[0]],
        error: null,
      });

      const singleRanked: RankedChunk[] = [{ ...mockChunks[0]!, rerank_score: 0.95 }];
      mockRerankService.rerank.mockResolvedValueOnce({
        selected: singleRanked,
        allCandidates: singleRanked,
        rerankApplied: true,
      } as RerankResult);

      await service.assembleContext(goalId, userId);

      const summaryCall = logSpy.mock.calls[0]![0] as string;
      const summaryJson = JSON.parse(summaryCall.replace('Retrieval complete: ', ''));
      expect(typeof summaryJson.latency_ms).toBe('number');
      expect(summaryJson.latency_ms).toBeGreaterThanOrEqual(0);

      logSpy.mockRestore();
    });
  });
});
