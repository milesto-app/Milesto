import { GoogleGenAI } from '@google/genai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { appConfig } from '../config/app.config.js';
import type { TranscriptionResult } from './voice.types.js';

const DEFAULT_CONFIDENCE = 0.95;
const BYTES_PER_SECOND_ESTIMATE = 16_000;
const LANGUAGE_NAMES: Record<string, string> = { en: 'English', fr: 'French' };

@Injectable()
export class VoiceSttService {
  private readonly logger = new Logger(VoiceSttService.name);
  private readonly ai: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('GOOGLE_AI_API_KEY');
    this.ai = new GoogleGenAI({ apiKey });
  }

  public async transcribe(
    audioBuffer: Buffer,
    mimetype: string,
    language: string,
  ): Promise<TranscriptionResult> {
    try {
      const text = await this.callGemini(audioBuffer, mimetype, language);
      const duration = this.estimateDuration(audioBuffer);

      this.logger.log(
        `Transcription complete: ~${String(duration)}s audio, text="${text}"`,
      );

      return {
        text,
        confidence: DEFAULT_CONFIDENCE,
        duration_seconds: duration,
        language,
      };
    } catch (error) {
      this.logTranscriptionError(error);
      throw error;
    }
  }

  private async callGemini(
    audioBuffer: Buffer,
    mimetype: string,
    language: string,
  ): Promise<string> {
    const languageName = LANGUAGE_NAMES[language] ?? 'English';
    const response = await this.ai.models.generateContent({
      model: appConfig.voice.sttModel,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimetype,
                data: audioBuffer.toString('base64'),
              },
            },
            {
              text: `Transcribe this audio accurately. The speaker is likely speaking ${languageName}. Return ONLY the transcription text, nothing else.`,
            },
          ],
        },
      ],
    });

    return response.text?.trim() ?? '';
  }

  private estimateDuration(audioBuffer: Buffer): number {
    return audioBuffer.length / BYTES_PER_SECOND_ESTIMATE;
  }

  private logTranscriptionError(error: unknown): void {
    this.logger.error(
      `Transcription failed: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error.stack : undefined,
    );
  }
}
