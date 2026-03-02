import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CoachController } from './coach.controller.js';
import { CoachService } from './coach.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
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
  deepgram_voice_id: 'aura-asteria-en',
  deepgram_voice_model: 'aura',
  is_active: true,
};

let controller: CoachController;
let coachService: {
  listCoaches: jest.Mock;
  getCoach: jest.Mock;
};

beforeEach(async () => {
  coachService = {
    listCoaches: jest.fn(),
    getCoach: jest.fn(),
  };

  const module: TestingModule = await Test.createTestingModule({
    controllers: [CoachController],
    providers: [
      { provide: CoachService, useValue: coachService },
      { provide: SupabaseService, useValue: {} },
    ],
  }).compile();

  controller = module.get<CoachController>(CoachController);
});

it('CoachController should be defined', () => {
  expect(controller).toBeDefined();
});

describe('CoachController.listCoaches', () => {
  it('should return an array of coaches', async () => {
    coachService.listCoaches.mockResolvedValue([MOCK_COACH]);

    const result = await controller.listCoaches();

    expect(coachService.listCoaches).toHaveBeenCalled();
    expect(result).toEqual([MOCK_COACH]);
  });
});

describe('CoachController.getCoach', () => {
  it('should return a single coach by id', async () => {
    coachService.getCoach.mockResolvedValue(MOCK_COACH);

    const result = await controller.getCoach(1);

    expect(coachService.getCoach).toHaveBeenCalledWith(1);
    expect(result).toEqual(MOCK_COACH);
  });

  it('should throw NotFoundException for invalid coach id', async () => {
    coachService.getCoach.mockRejectedValue(
      new NotFoundException(`Coach with id ${NONEXISTENT_COACH_ID} not found`),
    );

    await expect(controller.getCoach(NONEXISTENT_COACH_ID)).rejects.toThrow(NotFoundException);
  });
});
