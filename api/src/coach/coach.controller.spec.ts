import { NotFoundException } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { SupabaseService } from "../supabase/supabase.service.js";
import { CoachController } from "./coach.controller.js";
import { COACHES } from "./coaches.config.js";

const NONEXISTENT_COACH_ID = 999;
const EXISTING_COACH_ID = 1;

let controller: CoachController;

beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [CoachController],
    providers: [{ provide: SupabaseService, useValue: {} }],
  }).compile();

  controller = module.get<CoachController>(CoachController);
});

it("CoachController should be defined", () => {
  expect(controller).toBeDefined();
});

describe("CoachController.listCoaches", () => {
  it("should return all configured coaches", () => {
    const result = controller.listCoaches();

    expect(result.length).toBe(COACHES.length);
  });

  it("should not leak elevenlabsVoiceId in the response", () => {
    const result = controller.listCoaches();

    for (const coach of result) {
      expect(coach).not.toHaveProperty("elevenlabsVoiceId");
    }
  });
});

describe("CoachController.getCoach", () => {
  it("should return a single coach by id", () => {
    const result = controller.getCoach(EXISTING_COACH_ID);

    expect(result.id).toBe(EXISTING_COACH_ID);
  });

  it("should not leak elevenlabsVoiceId in the response", () => {
    const result = controller.getCoach(EXISTING_COACH_ID);

    expect(result).not.toHaveProperty("elevenlabsVoiceId");
  });

  it("should throw NotFoundException for invalid coach id", () => {
    expect(() => controller.getCoach(NONEXISTENT_COACH_ID)).toThrow(
      NotFoundException,
    );
  });
});
