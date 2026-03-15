import { NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { SupabaseService } from '../supabase/supabase.service.js';
import { CoachService } from './coach.service.js';
import type { Coach } from './coach.types.js';

const NONEXISTENT_COACH_ID = 999;

const MOCK_COACH: Coach = {
  id: 1,
  personality: 'motivateur',
  display_name_fr: 'Le Motivateur',
  display_name_en: 'The Motivator',
  description_fr: 'Un coach energique',
  description_en: 'An energetic coach',
  icon: 'fire',
  elevenlabs_voice_id: 'Kore',
  is_active: true,
};

let service: CoachService;
let mockSupabase: { from: jest.Mock };

function mockSelectAllChain(data: unknown, error: unknown): void {
  mockSupabase.from.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data, error }),
      }),
    }),
  });
}

function mockSelectOneChain(data: unknown, error: unknown): void {
  mockSupabase.from.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data, error }),
        }),
      }),
    }),
  });
}

beforeEach(async () => {
  mockSupabase = { from: jest.fn() };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CoachService,
      {
        provide: SupabaseService,
        useValue: { getAdminClient: () => mockSupabase },
      },
    ],
  }).compile();

  service = module.get<CoachService>(CoachService);
});

it('CoachService should be defined', () => {
  expect(service).toBeDefined();
});

describe('CoachService.listCoaches', () => {
  it('should return active coaches ordered by id', async () => {
    mockSelectAllChain([MOCK_COACH], null);

    const result = await service.listCoaches();

    expect(result).toEqual([MOCK_COACH]);
    expect(mockSupabase.from).toHaveBeenCalledWith('coaches');
  });

  it('should throw NotFoundException on Supabase error', async () => {
    mockSelectAllChain(null, { message: 'Database error' });

    await expect(service.listCoaches()).rejects.toThrow(NotFoundException);
  });
});

describe('CoachService.getCoach', () => {
  it('should return a single coach when found', async () => {
    mockSelectOneChain(MOCK_COACH, null);

    const result = await service.getCoach(1);

    expect(result).toEqual(MOCK_COACH);
    expect(mockSupabase.from).toHaveBeenCalledWith('coaches');
  });

  it('should throw NotFoundException when coach not found', async () => {
    mockSelectOneChain(null, { code: 'PGRST116', message: 'not found' });

    await expect(service.getCoach(NONEXISTENT_COACH_ID)).rejects.toThrow(
      NotFoundException,
    );
  });
});
