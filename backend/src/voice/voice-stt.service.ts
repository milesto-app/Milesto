import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ElevenLabsClient } from "elevenlabs";

import type { TranscriptionResult } from "./voice.types.js";

const STT_MODEL_ID = "scribe_v2";

@Injectable()
export class VoiceSttService {
  private readonly logger = new Logger(VoiceSttService.name);
  private readonly client: ElevenLabsClient;

  constructor(private readonly configService: ConfigService) {
    this.client = new ElevenLabsClient({
      apiKey: this.configService.getOrThrow<string>("ELEVENLABS_API_KEY"),
    });
  }

  public async transcribe(
    audioBuffer: Buffer,
    mimetype: string,
    language: string,
  ): Promise<TranscriptionResult> {
    try {
      this.logger.log(
        `Received audio: ${String(audioBuffer.length)} bytes, mimetype=${mimetype}, language=${language}`,
      );

      /* eslint-disable @typescript-eslint/naming-convention */
      const extensionMap: Record<string, string> = {
        "audio/wav": "wav",
        "audio/mpeg": "mp3",
        "audio/mp4": "mp4",
      };
      /* eslint-enable @typescript-eslint/naming-convention */
      const extension = extensionMap[mimetype] ?? "webm";
      const file = new File(
        [new Uint8Array(audioBuffer)],
        `recording.${extension}`,
        { type: mimetype },
      );

      const response = await this.client.speechToText.convert({
        file,
        model_id: STT_MODEL_ID,
        language_code: language,
        timestamps_granularity: "word",
      });

      const duration = this.estimateDuration(response.words);

      this.logger.log(
        `Transcription complete: ~${duration.toFixed(1)}s audio, text="${response.text}"`,
      );

      return {
        text: response.text,
        confidence: response.language_probability,
        duration_seconds: duration,
        language: response.language_code,
      };
    } catch (error) {
      this.logger.error(
        `Transcription failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private estimateDuration(words: { start?: number; end?: number }[]): number {
    const lastWord = words[words.length - 1];
    return lastWord?.end ?? 0;
  }
}
