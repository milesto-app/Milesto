import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, DeepgramClient } from '@deepgram/sdk';

import { appConfig } from '../config/app.config.js';
import type { TranscriptionResult } from './voice.types.js';

const DEFAULT_CONFIDENCE = 0;
const DEFAULT_DURATION = 0;
const DEFAULT_LANGUAGE = 'en';

interface DeepgramChannel {
  alternatives: { transcript: string; confidence: number }[];
  detected_language?: string;
}

@Injectable()
export class VoiceSttService {
  private readonly logger = new Logger(VoiceSttService.name);
  private readonly deepgram: DeepgramClient;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('DEEPGRAM_API_KEY');
    this.deepgram = createClient(apiKey);
  }

  public async transcribe(audioBuffer: Buffer, mimetype: string): Promise<TranscriptionResult> {
    const timeout = setTimeout(() => {
      /* abort after timeout */
    }, appConfig.voice.callTimeoutMs);

    try {
      const response = await this.callDeepgram(audioBuffer, mimetype);
      return this.parseResponse(response);
    } catch (error) {
      this.logTranscriptionError(error);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async callDeepgram(
    audioBuffer: Buffer,
    mimetype: string,
  ): Promise<{
    result: { metadata?: { duration: number }; results: { channels: DeepgramChannel[] } };
  }> {
    const { result, error } = await this.deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
      model: appConfig.voice.sttModel,
      language: appConfig.voice.sttLanguage,
      smart_format: true,
      mimetype,
    });

    if (error !== null) {
      throw new Error(`Deepgram STT error: ${error.message}`);
    }

    return { result };
  }

  private parseResponse(response: {
    result: { metadata?: { duration: number }; results: { channels: DeepgramChannel[] } };
  }): TranscriptionResult {
    const extracted = this.extractChannelData(response.result);
    const duration = response.result.metadata?.duration ?? DEFAULT_DURATION;

    this.logger.log(
      `Transcription complete: ${String(duration)}s audio, ` +
        `confidence=${String(extracted.confidence)}, text="${extracted.transcript}"`,
    );

    return {
      text: extracted.transcript,
      confidence: extracted.confidence,
      duration_seconds: duration,
      language: extracted.language,
    };
  }

  private extractChannelData(result: { results: { channels: DeepgramChannel[] } }): {
    transcript: string;
    confidence: number;
    language: string;
  } {
    const channel = result.results.channels[0];
    const alternative = channel?.alternatives[0];

    return {
      transcript: alternative?.transcript ?? '',
      confidence: alternative?.confidence ?? DEFAULT_CONFIDENCE,
      language: channel?.detected_language ?? DEFAULT_LANGUAGE,
    };
  }

  private logTranscriptionError(error: unknown): void {
    this.logger.error(
      `Transcription failed: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error.stack : undefined,
    );
  }
}
