import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Readable } from 'stream';

import { VoiceTtsService } from './voice-tts.service.js';

const MOCK_VOICE_ID = 'rachel';
const MOCK_AUDIO_DATA = Buffer.from('fake-audio-data');

const mockConvert = jest.fn();

jest.mock('elevenlabs', () => ({
  ElevenLabsClient: jest.fn().mockImplementation(() => ({
    textToSpeech: { convert: mockConvert },
  })),
}));

function createReadableFromBuffer(buf: Buffer): Readable {
  const readable = new Readable();
  readable.push(buf);
  readable.push(null);
  return readable;
}

let service: VoiceTtsService;

beforeEach(async () => {
  mockConvert.mockReset();

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
    mockConvert.mockResolvedValue(createReadableFromBuffer(MOCK_AUDIO_DATA));

    const result = await service.synthesize('Hello', MOCK_VOICE_ID);

    expect(result.content_type).toBe('audio/mpeg');
    expect(result.audio.length).toBeGreaterThan(0);
    expect(result.duration_seconds).toBeGreaterThan(0);
  });

  it('should pass voice ID and model to ElevenLabs', async () => {
    mockConvert.mockResolvedValue(createReadableFromBuffer(MOCK_AUDIO_DATA));

    await service.synthesize('Test text', MOCK_VOICE_ID);

    expect(mockConvert).toHaveBeenCalledWith(
      MOCK_VOICE_ID,
      expect.objectContaining({
        text: 'Test text',
        model_id: 'eleven_flash_v2_5',
        output_format: 'mp3_44100_128',
      }),
    );
  });
});

describe('VoiceTtsService error handling', () => {
  it('should throw when ElevenLabs returns an error', async () => {
    mockConvert.mockRejectedValue(new Error('TTS synthesis failed'));

    await expect(
      service.synthesize('Hello', MOCK_VOICE_ID),
    ).rejects.toThrow('TTS synthesis failed');
  });
});
