import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { AiService } from "../ai/ai.service.js";
import { COACH_BY_ID } from "../coach/coaches.config.js";
import { config } from "../config/app.config.js";
import { NotificationCopyService } from "./notification-copy.service.js";
import type { NotificationPromptInput } from "./notification-prompts.js";

let service: NotificationCopyService;
let mockAiService: { generateJson: jest.Mock };

const coach = COACH_BY_ID.get(1);
if (coach === undefined) {
  throw new Error("Coach fixture missing");
}
const coachFixture = coach;

const baseInput: NotificationPromptInput = {
  coach: coachFixture,
  language: "en",
  timeOfDay: "morning",
  goalTitle: "Ship Momentum v2",
  nextTaskTitle: "Draft the release notes",
};

beforeEach(async () => {
  mockAiService = { generateJson: jest.fn() };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      NotificationCopyService,
      { provide: AiService, useValue: mockAiService },
    ],
  }).compile();

  service = module.get<NotificationCopyService>(NotificationCopyService);
});

describe("NotificationCopyService.generate", () => {
  it("should call AiService with the configured copy model and timeout", async () => {
    mockAiService.generateJson.mockResolvedValue({
      title: "Time to ship",
      body: "Draft those release notes now.",
    });

    await service.generate(baseInput);

    expect(mockAiService.generateJson).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      config.notifications.copyModel,
      undefined,
      config.notifications.copyCallTimeoutMs,
    );
  });

  it("should return sanitized copy when AI returns valid title and body", async () => {
    mockAiService.generateJson.mockResolvedValue({
      title: "  Time to ship  ",
      body: "  Draft those release notes now.  ",
    });

    const result = await service.generate(baseInput);

    expect(result).toEqual({
      title: "Time to ship",
      body: "Draft those release notes now.",
    });
  });

  it("should truncate overlong title and body to configured limits", async () => {
    const longTitle = "x".repeat(config.notifications.maxTitleLength + 10);
    const longBody = "y".repeat(config.notifications.maxBodyLength + 20);
    mockAiService.generateJson.mockResolvedValue({
      title: longTitle,
      body: longBody,
    });

    const result = await service.generate(baseInput);

    expect(result?.title).toHaveLength(config.notifications.maxTitleLength);
    expect(result?.body).toHaveLength(config.notifications.maxBodyLength);
  });

  it("should return null when AI returns empty title", async () => {
    mockAiService.generateJson.mockResolvedValue({ title: "", body: "ok" });

    const result = await service.generate(baseInput);

    expect(result).toBeNull();
  });

  it("should return null when AiService throws", async () => {
    mockAiService.generateJson.mockRejectedValue(new Error("openrouter down"));

    const result = await service.generate(baseInput);

    expect(result).toBeNull();
  });
});
