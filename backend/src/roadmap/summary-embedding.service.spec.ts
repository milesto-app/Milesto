import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SummaryEmbeddingService } from './summary-embedding.service.js';
import { AiService } from '../ai/ai.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';

describe('SummaryEmbeddingService', () => {
  let service: SummaryEmbeddingService;
  let mockAiService: { generateEmbedding: jest.Mock };
  let mockSupabaseService: { getAdminClient: jest.Mock };

  beforeEach(async () => {
    mockAiService = { generateEmbedding: jest.fn() };
    mockSupabaseService = { getAdminClient: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummaryEmbeddingService,
        { provide: AiService, useValue: mockAiService },
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<SummaryEmbeddingService>(SummaryEmbeddingService);
  });

  describe('handleDebriefSubmitted', () => {
    it('should generate embedding and store it', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockAiService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      await service.handleDebriefSubmitted({
        debriefId: 'debrief-uuid',
        goalId: 'goal-uuid',
        userId: 'user-uuid',
        note: 'Some reflection',
      });

      expect(mockAiService.generateEmbedding).toHaveBeenCalledWith('Some reflection');
    });

    it('should handle embedding failure gracefully', async () => {
      mockAiService.generateEmbedding.mockRejectedValue(new Error('API failure'));

      await expect(
        service.handleDebriefSubmitted({
          debriefId: 'debrief-uuid',
          goalId: 'goal-uuid',
          userId: 'user-uuid',
          note: 'Some reflection',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('handleSummaryGenerated', () => {
    it('should generate embedding for summary content', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockAiService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      await service.handleSummaryGenerated({
        planId: 'plan-uuid',
        goalId: 'goal-uuid',
        userId: 'user-uuid',
        summary: { completion_rate: 80, objectives_completed: 4, objectives_total: 5 },
        contentText: 'Weekly summary text',
      });

      expect(mockAiService.generateEmbedding).toHaveBeenCalledWith('Weekly summary text');
    });
  });
});
