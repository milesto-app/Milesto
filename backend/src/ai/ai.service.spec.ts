import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service.js';
import { appConfig } from '../config/app.config.js';

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
        useValue: { getOrThrow: jest.fn().mockReturnValue('test-api-key') },
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

describe('AiService.generateEmbedding', () => {
  const mockVector = new Array(appConfig.ai.embeddingDimensions).fill(
    MOCK_EMBEDDING_VALUE,
  ) as number[];

  it('should call OpenAI embeddings API with correct params', async () => {
    mockOpenai.embeddings.create.mockResolvedValue({
      data: [{ embedding: mockVector }],
    });

    await service.generateEmbedding('test text');

    expect(mockOpenai.embeddings.create).toHaveBeenCalledWith(
      {
        model: appConfig.ai.embeddingModel,
        input: 'test text',
        dimensions: appConfig.ai.embeddingDimensions,
      },
      expect.objectContaining({
        signal: expect.any(AbortSignal) as AbortSignal,
      }),
    );
  });

  it('should return the embedding vector', async () => {
    mockOpenai.embeddings.create.mockResolvedValue({
      data: [{ embedding: mockVector }],
    });

    const result = await service.generateEmbedding('test text');

    expect(result).toEqual(mockVector);
    expect(result).toHaveLength(appConfig.ai.embeddingDimensions);
  });

  it('should propagate errors from the OpenAI SDK', async () => {
    mockOpenai.embeddings.create.mockRejectedValue(
      new Error('OpenAI API error'),
    );

    await expect(service.generateEmbedding('test text')).rejects.toThrow(
      'OpenAI API error',
    );
  });

  it('should apply timeout via AbortController', async () => {
    mockOpenai.embeddings.create.mockResolvedValue({
      data: [{ embedding: mockVector }],
    });

    await service.generateEmbedding('test text');

    const callArgs = mockOpenai.embeddings.create.mock.calls[0] as unknown[];
    const options = callArgs[1] as { signal: AbortSignal };
    expect(options).toHaveProperty('signal');
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
});
