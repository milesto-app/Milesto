import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { VoiceTtsService } from './voice-tts.service.js';

const MOCK_VOICE_ID = 'Kore';
const MOCK_AUDIO_BASE64 = Buffer.from('fake-audio-data').toString('base64');

const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors SDK export
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

let service: VoiceTtsService;

beforeEach(async () => {
  mockGenerateContent.mockReset();

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
    mockGenerateContent.mockResolvedValue({
      candidates: [
        { content: { parts: [{ inlineData: { data: MOCK_AUDIO_BASE64 } }] } },
      ],
    });

    const result = await service.synthesize('Hello', MOCK_VOICE_ID);

    expect(result.content_type).toBe('audio/wav');
    expect(result.audio.length).toBeGreaterThan(0);
  });

  it('should throw when no audio data is returned', async () => {
    mockGenerateContent.mockResolvedValue({ candidates: [] });

    await expect(service.synthesize('Hello', MOCK_VOICE_ID)).rejects.toThrow(
      'Gemini TTS returned no audio data',
    );
  });

  it('should call Gemini with correct voice config', async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        { content: { parts: [{ inlineData: { data: MOCK_AUDIO_BASE64 } }] } },
      ],
    });

    await service.synthesize('Test text', MOCK_VOICE_ID);

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: MOCK_VOICE_ID } },
          },
        }),
      }),
    );
  });
});
