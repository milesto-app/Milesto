/* eslint-disable max-lines-per-function */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { QualityMilestoneService } from './quality-milestone.service.js';
import { AiService } from '../ai/ai.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';

describe('QualityMilestoneService', () => {
  let service: QualityMilestoneService;
  let mockAiService: { generateJSON: jest.Mock };
  let mockSupabaseService: { getAdminClient: jest.Mock };

  beforeEach(async () => {
    mockAiService = { generateJSON: jest.fn() };
    mockSupabaseService = { getAdminClient: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QualityMilestoneService,
        { provide: AiService, useValue: mockAiService },
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<QualityMilestoneService>(QualityMilestoneService);
  });

  describe('handleRoadmapGenerated', () => {
    it('should evaluate and store quality scores', async () => {
      const mockFrom = jest.fn();
      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'roadmap-uuid', generation_metadata: {} },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [{ title: 'M1', description: 'D1' }],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { title: 'Goal', description: 'Desc' },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        });

      mockSupabaseService.getAdminClient.mockReturnValue({ from: mockFrom });
      mockAiService.generateJSON.mockResolvedValue({
        coherence: 4,
        personalization: 3,
        progression: 5,
        deadline_alignment: 4,
      });

      await service.handleRoadmapGenerated({
        roadmapId: 'roadmap-uuid',
        goalId: 'goal-uuid',
      });

      expect(mockAiService.generateJSON).toHaveBeenCalled();
    });

    it('should handle missing roadmap gracefully', async () => {
      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
            }),
          }),
        }),
      });

      await expect(
        service.handleRoadmapGenerated({
          roadmapId: 'roadmap-uuid',
          goalId: 'goal-uuid',
        }),
      ).resolves.not.toThrow();
    });
  });
});
