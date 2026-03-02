import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

import { appConfig } from '../config/app.config.js';
import type { SynthesisResult } from './voice.types.js';

const CONTENT_TYPE = 'audio/wav';
const WAV_BYTES_PER_SECOND = 48_000;

@Injectable()
export class VoiceTtsService {
  private readonly logger = new Logger(VoiceTtsService.name);
  private readonly ai: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('GOOGLE_AI_API_KEY');
    this.ai = new GoogleGenAI({ apiKey });
  }

  public async synthesize(text: string, voiceId: string): Promise<SynthesisResult> {
    try {
      const audioBuffer = await this.callGeminiTts(text, voiceId);
      const duration = this.estimateDuration(audioBuffer);

      this.logger.log(`Synthesis complete: ${String(audioBuffer.length)} bytes`);

      return {
        audio: audioBuffer,
        content_type: CONTENT_TYPE,
        duration_seconds: duration,
      };
    } catch (error) {
      this.logger.error(
        `Synthesis failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private async callGeminiTts(text: string, voiceId: string): Promise<Buffer> {
    const response = await this.ai.models.generateContent({
      model: appConfig.voice.ttsModel,
      contents: [{ role: 'user', parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } },
        },
      },
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.[0];
    const audioData = audioPart?.inlineData?.data;

    if (audioData === undefined) {
      throw new Error('Gemini TTS returned no audio data');
    }

    return Buffer.from(audioData, 'base64');
  }

  private estimateDuration(audioBuffer: Buffer): number {
    return audioBuffer.length / WAV_BYTES_PER_SECOND;
  }
}
