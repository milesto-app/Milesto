import { Injectable, Logger, NotFoundException } from "@nestjs/common";

import { COACH_BY_ID } from "../coach/coaches.config.js";
import { UserLanguageService } from "../common/user-language.service.js";
import { UsageService } from "../usage/usage.service.js";
import { GenerationType } from "../usage/usage.types.js";
import type { SynthesizeLanguage } from "./dto/synthesize.dto.js";
import type { SynthesisResult, TranscriptionResult } from "./voice.types.js";
import { VoiceSttService } from "./voice-stt.service.js";
import { VoiceTtsService } from "./voice-tts.service.js";

type SupportedLanguage = SynthesizeLanguage;

const FRENCH_LANGUAGE_PREFIX = "fr";

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
    userId: string,
    requestedLanguage?: SupportedLanguage,
  ): Promise<SynthesisResult> {
    const language =
      requestedLanguage ?? (await this.resolveUserLanguage(userId));
    const voiceId = this.resolveVoiceId(coachId, language);
    this.logger.log(`Synthesizing for coach ${String(coachId)} in ${language}`);
    return this.ttsService.synthesize(text, voiceId);
  }

  private async resolveUserLanguage(
    userId: string,
  ): Promise<SupportedLanguage> {
    const rawLanguage = await this.languageService.getLanguage(userId);
    return this.normalizeLanguage(rawLanguage);
  }

  private resolveVoiceId(coachId: number, language: SupportedLanguage): string {
    const coach = COACH_BY_ID.get(coachId);

    if (coach === undefined) {
      throw new NotFoundException(`Coach with id ${String(coachId)} not found`);
    }

    return coach.elevenlabsVoiceId[language];
  }

  private normalizeLanguage(raw: string): SupportedLanguage {
    const prefix = raw.toLowerCase().split(/[-_]/)[0];
    return prefix === FRENCH_LANGUAGE_PREFIX ? "fr" : "en";
  }
}
