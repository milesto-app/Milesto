import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ElevenLabsClient } from "elevenlabs";
import type { Readable } from "stream";

import { config } from "../config/app.config.js";
import type { SynthesisResult } from "./voice.types.js";

const CONTENT_TYPE = "audio/mpeg";
const MP3_BITRATE_BYTES_PER_SECOND = 16_000;

@Injectable()
export class VoiceTtsService {
  private readonly logger = new Logger(VoiceTtsService.name);
  private readonly client: ElevenLabsClient;

  constructor(private readonly configService: ConfigService) {
    this.client = new ElevenLabsClient({
      apiKey: this.configService.getOrThrow<string>("ELEVENLABS_API_KEY"),
    });
  }

  public async synthesize(
    text: string,
    voiceId: string,
  ): Promise<SynthesisResult> {
    try {
      const audioStream = await this.client.textToSpeech.convert(voiceId, {
        text,
        model_id: config.voice.ttsModelId,
        output_format: config.voice.outputFormat,
      });

      const audioBuffer = await this.streamToBuffer(audioStream);
      const duration = audioBuffer.length / MP3_BITRATE_BYTES_PER_SECOND;

      this.logger.log(
        `Synthesis complete: ${String(audioBuffer.length)} bytes`,
      );

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

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk as Buffer));
    }
    return Buffer.concat(chunks);
  }
}
