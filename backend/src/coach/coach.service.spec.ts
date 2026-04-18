import { NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { CoachService } from './coach.service.js';
import { COACHES } from './coaches.config.js';

const NONEXISTENT_COACH_ID = 999;
const EXISTING_COACH_ID = 1;

let service: CoachService;

beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [CoachService],
  }).compile();

  service = module.get<CoachService>(CoachService);
});

it('CoachService should be defined', () => {
  expect(service).toBeDefined();
});

describe('CoachService.listCoaches', () => {
  it('should return all configured coaches', () => {
    const result = service.listCoaches();

    expect(result).toEqual([...COACHES]);
  });
});

describe('CoachService.getCoach', () => {
  it('should return a single coach when found', () => {
    const result = service.getCoach(EXISTING_COACH_ID);

    expect(result.id).toBe(EXISTING_COACH_ID);
  });

  it('should throw NotFoundException when coach not found', () => {
    expect(() => service.getCoach(NONEXISTENT_COACH_ID)).toThrow(
      NotFoundException,
    );
  });
});
