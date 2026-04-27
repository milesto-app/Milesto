import { Injectable } from "@nestjs/common";

import { UserLanguageService } from "../common/user-language.service.js";
import { UsageService } from "../usage/usage.service.js";
import { GenerationType } from "../usage/usage.types.js";
import type { TranscriptionResult } from "./transcription.types.js";
import { TranscriptionSttService } from "./transcription-stt.service.js";

@Injectable()
export class TranscriptionService {
  constructor(
    private readonly sttService: TranscriptionSttService,
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
}
