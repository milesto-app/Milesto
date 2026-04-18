import { NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { UserLanguageService } from '../common/user-language.service.js';
import { UsageService } from '../usage/usage.service.js';
import { VoiceService } from './voice.service.js';
import { VoiceSttService } from './voice-stt.service.js';
import { VoiceTtsService } from './voice-tts.service.js';

const MOTIVATOR_COACH_ID = 1;
const UNKNOWN_COACH_ID = 999;
const TEST_USER_ID = 'user-123';
const TEST_TEXT = 'Hello';

const MOCK_AUDIO_RESULT = {
  audio: Buffer.from('audio'),
  content_type: 'audio/mpeg',
  duration_seconds: 1.0,
};

let service: VoiceService;
let ttsSynthesize: jest.Mock;
let getLanguage: jest.Mock;

beforeEach(async () => {
  ttsSynthesize = jest.fn().mockResolvedValue(MOCK_AUDIO_RESULT);
  getLanguage = jest.fn();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      VoiceService,
      { provide: VoiceSttService, useValue: { transcribe: jest.fn() } },
      { provide: VoiceTtsService, useValue: { synthesize: ttsSynthesize } },
      { provide: UserLanguageService, useValue: { getLanguage } },
      {
        provide: UsageService,
        useValue: { reserveGeneration: jest.fn() },
      },
    ],
  }).compile();

  service = module.get<VoiceService>(VoiceService);
});

describe('VoiceService.synthesize language selection', () => {
  it('should use English voice id for en user', async () => {
    getLanguage.mockResolvedValue('en');

    await service.synthesize(TEST_TEXT, MOTIVATOR_COACH_ID, TEST_USER_ID);

    expect(ttsSynthesize).toHaveBeenCalledWith(
      TEST_TEXT,
      'e79RFuEzhsq38bytJLIt',
    );
  });

  it('should use French voice id for fr user', async () => {
    getLanguage.mockResolvedValue('fr');

    await service.synthesize(TEST_TEXT, MOTIVATOR_COACH_ID, TEST_USER_ID);

    expect(ttsSynthesize).toHaveBeenCalledWith(
      TEST_TEXT,
      '5jCmrHdxbpU36l1wb3Ke',
    );
  });

  it('should normalize fr-FR to French voice', async () => {
    getLanguage.mockResolvedValue('fr-FR');

    await service.synthesize(TEST_TEXT, MOTIVATOR_COACH_ID, TEST_USER_ID);

    expect(ttsSynthesize).toHaveBeenCalledWith(
      TEST_TEXT,
      '5jCmrHdxbpU36l1wb3Ke',
    );
  });

  it('should normalize EN to English voice', async () => {
    getLanguage.mockResolvedValue('EN');

    await service.synthesize(TEST_TEXT, MOTIVATOR_COACH_ID, TEST_USER_ID);

    expect(ttsSynthesize).toHaveBeenCalledWith(
      TEST_TEXT,
      'e79RFuEzhsq38bytJLIt',
    );
  });

  it('should fall back to English voice for unsupported language', async () => {
    getLanguage.mockResolvedValue('de');

    await service.synthesize(TEST_TEXT, MOTIVATOR_COACH_ID, TEST_USER_ID);

    expect(ttsSynthesize).toHaveBeenCalledWith(
      TEST_TEXT,
      'e79RFuEzhsq38bytJLIt',
    );
  });

  it('should throw NotFoundException for unknown coach id', async () => {
    getLanguage.mockResolvedValue('en');

    await expect(
      service.synthesize(TEST_TEXT, UNKNOWN_COACH_ID, TEST_USER_ID),
    ).rejects.toThrow(NotFoundException);
    expect(ttsSynthesize).not.toHaveBeenCalled();
  });
});
