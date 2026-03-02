import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VoiceSttService } from './voice-stt.service.js';

const MOCK_TRANSCRIPT = 'Hello, how are you?';
const MOCK_CONFIDENCE = 0.98;
const MOCK_DURATION = 3.5;
const MOCK_LANGUAGE = 'en';

const mockTranscribeFile = jest.fn();

jest.mock('@deepgram/sdk', () => ({
  createClient: () => ({
    listen: {
      prerecorded: {
        transcribeFile: mockTranscribeFile,
      },
    },
  }),
}));

let service: VoiceSttService;

beforeEach(async () => {
  mockTranscribeFile.mockReset();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      VoiceSttService,
      {
        provide: ConfigService,
        useValue: { getOrThrow: () => 'test-api-key' },
      },
    ],
  }).compile();

  service = module.get<VoiceSttService>(VoiceSttService);
});

describe('VoiceSttService', () => {
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return transcription result when successful', async () => {
    mockTranscribeFile.mockResolvedValue({
      result: {
        metadata: { duration: MOCK_DURATION },
        results: {
          channels: [
            {
              alternatives: [{ transcript: MOCK_TRANSCRIPT, confidence: MOCK_CONFIDENCE }],
              detected_language: MOCK_LANGUAGE,
            },
          ],
        },
      },
      error: null,
    });

    const result = await service.transcribe(Buffer.from('audio'), 'audio/wav');

    expect(result.text).toBe(MOCK_TRANSCRIPT);
    expect(result.confidence).toBe(MOCK_CONFIDENCE);
    expect(result.language).toBe(MOCK_LANGUAGE);
  });

  it('should throw when Deepgram returns an error', async () => {
    mockTranscribeFile.mockResolvedValue({
      result: null,
      error: { message: 'Invalid audio' },
    });

    await expect(service.transcribe(Buffer.from('bad'), 'audio/wav')).rejects.toThrow(
      'Deepgram STT error: Invalid audio',
    );
  });

  it('should handle missing channel data gracefully', async () => {
    mockTranscribeFile.mockResolvedValue({
      result: {
        metadata: { duration: MOCK_DURATION },
        results: { channels: [] },
      },
      error: null,
    });

    const result = await service.transcribe(Buffer.from('audio'), 'audio/wav');

    expect(result.text).toBe('');
    expect(result.confidence).toBe(0);
  });
});
