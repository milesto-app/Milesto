import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { VoiceSttService } from './voice-stt.service.js';

const MOCK_TRANSCRIPT = 'Hello, how are you?';
const EXPECTED_CONFIDENCE = 0.95;

const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors SDK export
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

let service: VoiceSttService;

beforeEach(async () => {
  mockGenerateContent.mockReset();

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
    mockGenerateContent.mockResolvedValue({ text: MOCK_TRANSCRIPT });

    const result = await service.transcribe(
      Buffer.from('audio'),
      'audio/wav',
      'en',
    );

    expect(result.text).toBe(MOCK_TRANSCRIPT);
    expect(result.confidence).toBe(EXPECTED_CONFIDENCE);
    expect(result.language).toBe('en');
  });

  it('should return the passed language in the result', async () => {
    mockGenerateContent.mockResolvedValue({ text: MOCK_TRANSCRIPT });

    const result = await service.transcribe(
      Buffer.from('audio'),
      'audio/wav',
      'fr',
    );

    expect(result.language).toBe('fr');
  });

  it('should return empty text when response text is undefined', async () => {
    mockGenerateContent.mockResolvedValue({ text: undefined });

    const result = await service.transcribe(
      Buffer.from('audio'),
      'audio/wav',
      'en',
    );

    expect(result.text).toBe('');
  });

  it('should include language hint in Gemini prompt when language is fr', async () => {
    mockGenerateContent.mockResolvedValue({ text: MOCK_TRANSCRIPT });

    await service.transcribe(Buffer.from('audio'), 'audio/wav', 'fr');

    const calls = mockGenerateContent.mock.calls as unknown[][];
    const firstCall = calls[0] as [
      { contents: { parts: { text?: string }[] }[] },
    ];
    const promptText = firstCall[0].contents[0].parts[1].text;
    expect(promptText).toContain('The speaker is likely speaking French');
  });

  it('should default language name to English for unknown language code', async () => {
    mockGenerateContent.mockResolvedValue({ text: MOCK_TRANSCRIPT });

    await service.transcribe(Buffer.from('audio'), 'audio/wav', 'de');

    const calls = mockGenerateContent.mock.calls as unknown[][];
    const firstCall = calls[0] as [
      { contents: { parts: { text?: string }[] }[] },
    ];
    const promptText = firstCall[0].contents[0].parts[1].text;
    expect(promptText).toContain('The speaker is likely speaking English');
  });
});

describe('VoiceSttService error handling', () => {
  it('should throw when Gemini returns an error', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Invalid audio format'));

    await expect(
      service.transcribe(Buffer.from('bad'), 'audio/wav', 'en'),
    ).rejects.toThrow('Invalid audio format');
  });
});
