import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VoiceTtsService } from './voice-tts.service.js';

const MOCK_AUDIO = Buffer.from('fake-audio-data');
const MOCK_VOICE_ID = 'aura-asteria-en';

const mockRequest = jest.fn();

jest.mock('@deepgram/sdk', () => ({
  createClient: () => ({
    speak: {
      request: mockRequest,
    },
  }),
}));

function createMockStream(data: Buffer): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(data));
      controller.close();
    },
  });
}

let service: VoiceTtsService;

beforeEach(async () => {
  mockRequest.mockReset();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      VoiceTtsService,
      {
        provide: ConfigService,
        useValue: { getOrThrow: () => 'test-api-key' },
      },
    ],
  }).compile();

  service = module.get<VoiceTtsService>(VoiceTtsService);
});

describe('VoiceTtsService', () => {
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return synthesis result when successful', async () => {
    mockRequest.mockResolvedValue({
      getStream: () => Promise.resolve(createMockStream(MOCK_AUDIO)),
      getHeaders: () => Promise.resolve(new Headers()),
    });

    const result = await service.synthesize('Hello', MOCK_VOICE_ID);

    expect(result.content_type).toBe('audio/mpeg');
    expect(result.audio.length).toBeGreaterThan(0);
  });

  it('should throw when stream is null', async () => {
    mockRequest.mockResolvedValue({
      getStream: () => Promise.resolve(null),
      getHeaders: () => Promise.resolve(new Headers()),
    });

    await expect(service.synthesize('Hello', MOCK_VOICE_ID)).rejects.toThrow(
      'Deepgram TTS returned no audio stream',
    );
  });

  it('should call Deepgram with correct voice model', async () => {
    mockRequest.mockResolvedValue({
      getStream: () => Promise.resolve(createMockStream(MOCK_AUDIO)),
      getHeaders: () => Promise.resolve(new Headers()),
    });

    await service.synthesize('Test text', MOCK_VOICE_ID);

    expect(mockRequest).toHaveBeenCalledWith({ text: 'Test text' }, { model: MOCK_VOICE_ID });
  });
});
