import { NotFoundException } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { SupabaseService } from "../supabase/supabase.service.js";
import { CoachController } from "./coach.controller.js";
import { CoachService } from "./coach.service.js";
import type { PublicCoach } from "./coaches.config.js";

const NONEXISTENT_COACH_ID = 999;

const MOCK_COACH: PublicCoach = {
  id: 1,
  personality: "motivateur",
  displayName: { en: "The Motivator", fr: "Le Motivateur" },
  description: {
    en: "Energetic and enthusiastic",
    fr: "Energique et enthousiaste",
  },
  icon: "flame",
};

let controller: CoachController;
let coachService: {
  listPublicCoaches: jest.Mock;
  getPublicCoach: jest.Mock;
};

beforeEach(async () => {
  coachService = {
    listPublicCoaches: jest.fn(),
    getPublicCoach: jest.fn(),
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

it("CoachController should be defined", () => {
  expect(controller).toBeDefined();
});

describe("CoachController.listCoaches", () => {
  it("should return an array of coaches", () => {
    coachService.listPublicCoaches.mockReturnValue([MOCK_COACH]);

    const result = controller.listCoaches();

    expect(coachService.listPublicCoaches).toHaveBeenCalled();
    expect(result).toEqual([MOCK_COACH]);
  });

  it("should not leak elevenlabsVoiceId in the response", () => {
    coachService.listPublicCoaches.mockReturnValue([MOCK_COACH]);

    const result = controller.listCoaches();

    expect(result[0]).not.toHaveProperty("elevenlabsVoiceId");
  });
});

describe("CoachController.getCoach", () => {
  it("should return a single coach by id", () => {
    coachService.getPublicCoach.mockReturnValue(MOCK_COACH);

    const result = controller.getCoach(1);

    expect(coachService.getPublicCoach).toHaveBeenCalledWith(1);
    expect(result).toEqual(MOCK_COACH);
  });

  it("should not leak elevenlabsVoiceId in the response", () => {
    coachService.getPublicCoach.mockReturnValue(MOCK_COACH);

    const result = controller.getCoach(1);

    expect(result).not.toHaveProperty("elevenlabsVoiceId");
  });

  it("should throw NotFoundException for invalid coach id", () => {
    coachService.getPublicCoach.mockImplementation(() => {
      throw new NotFoundException(
        `Coach with id ${NONEXISTENT_COACH_ID} not found`,
      );
    });

    expect(() => controller.getCoach(NONEXISTENT_COACH_ID)).toThrow(
      NotFoundException,
    );
  });
});
