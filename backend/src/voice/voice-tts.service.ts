import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, DeepgramClient } from '@deepgram/sdk';

import { appConfig } from '../config/app.config.js';
import type { SynthesisResult } from './voice.types.js';

const CONTENT_TYPE = 'audio/mpeg';
const DEFAULT_DURATION = 0;

@Injectable()
export class VoiceTtsService {
  private readonly logger = new Logger(VoiceTtsService.name);
  private readonly deepgram: DeepgramClient;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('DEEPGRAM_API_KEY');
    this.deepgram = createClient(apiKey);
  }

  public async synthesize(text: string, voiceId: string): Promise<SynthesisResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, appConfig.voice.callTimeoutMs);

    try {
      const response = await this.deepgram.speak.request({ text }, { model: voiceId });
      const stream = await response.getStream();

      if (stream === null) {
        throw new Error('Deepgram TTS returned no audio stream');
      }

      const audioBuffer = await this.collectStream(stream);
      const headers = await response.getHeaders();
      const duration = this.parseDuration(headers);

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
    } finally {
      clearTimeout(timeout);
    }
  }

  private async collectStream(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    let done = false;
    while (!done) {
      // eslint-disable-next-line no-await-in-loop -- sequential stream reading
      const readResult = await reader.read();
      done = readResult.done;
      if (readResult.value !== undefined) {
        chunks.push(readResult.value);
      }
    }

    return Buffer.concat(chunks);
  }

  private parseDuration(headers: Headers): number {
    const durationHeader = headers.get('content-length');
    if (durationHeader === null) {
      return DEFAULT_DURATION;
    }
    return DEFAULT_DURATION;
  }
}
