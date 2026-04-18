import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { COACH_BY_ID } from '../coach/coaches.config.js';
import { UserLanguageService } from '../common/user-language.service.js';
import { UsageService } from '../usage/usage.service.js';
import { GenerationType } from '../usage/usage.types.js';
import type { SynthesisResult, TranscriptionResult } from './voice.types.js';
import { VoiceSttService } from './voice-stt.service.js';
import { VoiceTtsService } from './voice-tts.service.js';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private readonly sttService: VoiceSttService,
    private readonly ttsService: VoiceTtsService,
    private readonly languageService: UserLanguageService,
    private readonly usageService: UsageService,
  ) {}

  public async transcribe(
    audioBuffer: Buffer,
    mimetype: string,
    userId: string,
  ): Promise<TranscriptionResult> {
    await this.usageService.reserveGeneration(
      userId,
      GenerationType.VOICE_TRANSCRIPTION,
    );
    const language = await this.languageService.getLanguage(userId);
    return this.sttService.transcribe(audioBuffer, mimetype, language);
  }

  public async synthesize(
    text: string,
    coachId: number,
  ): Promise<SynthesisResult> {
    const voiceId = this.resolveVoiceId(coachId);
    this.logger.log(
      `Synthesizing for coach ${String(coachId)} with voice ${voiceId}`,
    );
    return this.ttsService.synthesize(text, voiceId);
  }

  private resolveVoiceId(coachId: number): string {
    const coach = COACH_BY_ID.get(coachId);

    if (coach === undefined) {
      throw new NotFoundException(`Coach with id ${String(coachId)} not found`);
    }

    return coach.elevenlabsVoiceId;
  }
}
