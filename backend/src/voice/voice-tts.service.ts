import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, DeepgramClient } from '@deepgram/sdk';

import { appConfig } from '../config/app.config.js';
import type { SynthesisResult } from './voice.types.js';

const CONTENT_TYPE = 'audio/mpeg';
const MP3_128KBPS_BYTES_PER_SECOND = 16_000;

@Injectable()
export class VoiceTtsService {
  private readonly logger = new Logger(VoiceTtsService.name);
  private readonly deepgram: DeepgramClient;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('DEEPGRAM_API_KEY');
    this.deepgram = createClient(apiKey);
  }

  public async synthesize(text: string, voiceId: string): Promise<SynthesisResult> {
    try {
      const response = await this.withTimeout(
        this.deepgram.speak.request({ text }, { model: voiceId }),
        appConfig.voice.callTimeoutMs,
      );
      const stream = await response.getStream();

      if (stream === null) {
        throw new Error('Deepgram TTS returned no audio stream');
      }

      const audioBuffer = await this.withTimeout(
        this.collectStream(stream),
        appConfig.voice.callTimeoutMs,
      );
      const duration = this.estimateDuration(audioBuffer);

      this.logger.log(`Synthesis complete: ${audioBuffer.length} bytes`);

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

  private async collectStream(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    for (;;) {
      // eslint-disable-next-line no-await-in-loop -- sequential stream reading
      const result = await reader.read();
      if (result.value !== undefined) {
        chunks.push(result.value);
      }
      if (result.done) {
        break;
      }
    }

    return Buffer.concat(chunks);
  }

  private estimateDuration(audioBuffer: Buffer): number {
    return audioBuffer.length / MP3_128KBPS_BYTES_PER_SECOND;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${ms}ms`));
      }, ms);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
