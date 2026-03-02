import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, DeepgramClient } from '@deepgram/sdk';

import { appConfig } from '../config/app.config.js';
import type { TranscriptionResult } from './voice.types.js';

const DEFAULT_CONFIDENCE = 0;
const DEFAULT_DURATION = 0;
const DEFAULT_LANGUAGE = 'en';

@Injectable()
export class VoiceSttService {
  private readonly logger = new Logger(VoiceSttService.name);
  private readonly deepgram: DeepgramClient;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('DEEPGRAM_API_KEY');
    this.deepgram = createClient(apiKey);
  }

  public async transcribe(audioBuffer: Buffer, mimetype: string): Promise<TranscriptionResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, appConfig.voice.callTimeoutMs);

    try {
      const { result, error } = await this.deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: appConfig.voice.sttModel,
          language: appConfig.voice.sttLanguage,
          smart_format: true,
          mimetype,
        },
      );

      if (error !== null) {
        throw new Error(`Deepgram STT error: ${error.message}`);
      }

      const channel = result.results.channels[0];
      const alternative = channel?.alternatives[0];
      const duration = result.metadata?.duration ?? DEFAULT_DURATION;
      const detectedLanguage = channel?.detected_language ?? DEFAULT_LANGUAGE;

      this.logger.log(`Transcription complete: ${String(duration)}s audio`);

      return {
        text: alternative?.transcript ?? '',
        confidence: alternative?.confidence ?? DEFAULT_CONFIDENCE,
        duration_seconds: duration,
        language: detectedLanguage,
      };
    } catch (error) {
      this.logger.error(
        `Transcription failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
