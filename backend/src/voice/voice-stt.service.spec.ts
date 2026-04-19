import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { VoiceSttService } from "./voice-stt.service.js";

const MOCK_TRANSCRIPT = "Hello, how are you?";

const mockConvert = jest.fn();

jest.mock("elevenlabs", () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ElevenLabsClient: jest.fn().mockImplementation(() => ({
    speechToText: { convert: mockConvert },
  })),
}));

let service: VoiceSttService;

beforeEach(async () => {
  mockConvert.mockReset();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      VoiceSttService,
      {
        provide: ConfigService,
        useValue: { getOrThrow: () => "test-api-key" },
      },
    ],
  }).compile();

  service = module.get<VoiceSttService>(VoiceSttService);
});

describe("VoiceSttService", () => {
  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should return transcription result when successful", async () => {
    mockConvert.mockResolvedValue({
      text: MOCK_TRANSCRIPT,
      language_code: "en",
      language_probability: 0.98,
      words: [
        { text: "Hello,", start: 0, end: 0.5, type: "word", logprob: -0.1 },
        { text: "how", start: 0.6, end: 0.8, type: "word", logprob: -0.1 },
        { text: "are", start: 0.9, end: 1.0, type: "word", logprob: -0.1 },
        { text: "you?", start: 1.1, end: 1.4, type: "word", logprob: -0.1 },
      ],
    });

    const result = await service.transcribe(
      Buffer.from("audio"),
      "audio/wav",
      "en",
    );

    expect(result.text).toBe(MOCK_TRANSCRIPT);
    expect(result.confidence).toBe(0.98);
    expect(result.duration_seconds).toBe(1.4);
    expect(result.language).toBe("en");
  });

  it("should pass language code to ElevenLabs", async () => {
    mockConvert.mockResolvedValue({
      text: MOCK_TRANSCRIPT,
      language_code: "fr",
      language_probability: 0.95,
      words: [
        { text: "Bonjour", start: 0, end: 0.5, type: "word", logprob: -0.1 },
      ],
    });

    await service.transcribe(Buffer.from("audio"), "audio/wav", "fr");

    expect(mockConvert).toHaveBeenCalledWith(
      expect.objectContaining({
        language_code: "fr",
        timestamps_granularity: "word",
      }),
    );
  });
});

describe("VoiceSttService error handling", () => {
  it("should throw when ElevenLabs returns an error", async () => {
    mockConvert.mockRejectedValue(new Error("Invalid audio format"));

    await expect(
      service.transcribe(Buffer.from("bad"), "audio/wav", "en"),
    ).rejects.toThrow("Invalid audio format");
  });
});
