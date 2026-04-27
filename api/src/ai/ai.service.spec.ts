import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { config } from "../config/app.config.js";
import { AiService } from "./ai.service.js";

const MOCK_EMBEDDING_VALUE = 0.1;

let service: AiService;
let mockOpenai: {
  embeddings: { create: jest.Mock };
  chat: { completions: { create: jest.Mock } };
};

beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AiService,
      {
        provide: ConfigService,
        useValue: { getOrThrow: jest.fn().mockReturnValue("test-api-key") },
      },
    ],
  }).compile();

  service = module.get<AiService>(AiService);

  mockOpenai = {
    embeddings: { create: jest.fn() },
    chat: { completions: { create: jest.fn() } },
  };
  (service as unknown as { openai: typeof mockOpenai }).openai = mockOpenai;
});

describe("AiService.generateEmbedding", () => {
  const mockVector = new Array(config.ai.embedding.dimensions).fill(
    MOCK_EMBEDDING_VALUE,
  ) as number[];

  it("should call OpenAI embeddings API with correct params", async () => {
    mockOpenai.embeddings.create.mockResolvedValue({
      data: [{ embedding: mockVector }],
    });

    await service.generateEmbedding("test text");

    expect(mockOpenai.embeddings.create).toHaveBeenCalledWith(
      {
        model: config.ai.embedding.model,
        input: "test text",
        dimensions: config.ai.embedding.dimensions,
      },
      expect.objectContaining({
        signal: expect.any(AbortSignal) as AbortSignal,
      }),
    );
  });

  it("should return the embedding vector", async () => {
    mockOpenai.embeddings.create.mockResolvedValue({
      data: [{ embedding: mockVector }],
    });

    const result = await service.generateEmbedding("test text");

    expect(result).toEqual(mockVector);
    expect(result).toHaveLength(config.ai.embedding.dimensions);
  });

  it("should propagate errors from the OpenAI SDK", async () => {
    mockOpenai.embeddings.create.mockRejectedValue(
      new Error("OpenAI API error"),
    );

    await expect(service.generateEmbedding("test text")).rejects.toThrow(
      "OpenAI API error",
    );
  });

  it("should apply timeout via AbortController", async () => {
    mockOpenai.embeddings.create.mockResolvedValue({
      data: [{ embedding: mockVector }],
    });

    await service.generateEmbedding("test text");

    const callArgs = mockOpenai.embeddings.create.mock.calls[0] as unknown[];
    const options = callArgs[1] as { signal: AbortSignal };
    expect(options).toHaveProperty("signal");
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("AiService.createStream", () => {
  it("should call OpenAI chat completions with correct params", async () => {
    const mockStream = { async *[Symbol.asyncIterator]() {} };
    mockOpenai.chat.completions.create.mockResolvedValue(mockStream);

    const messages = [{ role: "user" as const, content: "hello" }];
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "test_tool",
          description: "A test tool",
          parameters: { type: "object", properties: {} },
        },
      },
    ];

    await service.generateStream(messages, tools);

    expect(mockOpenai.chat.completions.create).toHaveBeenCalledWith({
      model: config.chat.model,
      messages,
      tools,
      stream: true,
    });
  });

  it("should return the stream from OpenAI", async () => {
    const mockStream = { async *[Symbol.asyncIterator]() {} };
    mockOpenai.chat.completions.create.mockResolvedValue(mockStream);

    const result = await service.generateStream([], []);

    expect(result).toBe(mockStream);
  });
});
