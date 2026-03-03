import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Modality, Session } from '@google/genai';

import { appConfig } from '../config/app.config.js';
import type {
  GeminiFunctionCall,
  GeminiLiveSession,
  GeminiSessionOptions,
  GeminiToolResponse,
} from './types/voice-chat.types.js';

const AUDIO_MIME_TYPE = 'audio/pcm;rate=16000';

interface GeminiMessagePart {
  readonly inlineData?: { readonly data: string };
}

interface GeminiRawMessage {
  readonly toolCall?: { readonly functionCalls?: readonly GeminiFunctionCall[] };
  readonly serverContent?: {
    readonly interrupted?: boolean;
    readonly turnComplete?: boolean;
    readonly modelTurn?: { readonly parts?: readonly GeminiMessagePart[] };
  };
}

function isGeminiMessage(msg: unknown): msg is GeminiRawMessage {
  return typeof msg === 'object' && msg !== null;
}

@Injectable()
export class GeminiLiveService {
  private readonly logger = new Logger(GeminiLiveService.name);
  private readonly ai: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('GOOGLE_AI_API_KEY');
    this.ai = new GoogleGenAI({ apiKey });
  }

  public async createSession(options: GeminiSessionOptions): Promise<GeminiLiveSession> {
    this.logger.log(`Creating Gemini Live session with voice: ${options.voiceName}`);

    const session = await this.ai.live.connect({
      model: appConfig.voice.liveModel,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: { parts: [{ text: options.systemInstruction }] },
        tools: [{ functionDeclarations: options.tools }],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: options.voiceName } },
        },
      },
      callbacks: {
        onmessage: (message) => {
          this.handleMessage(message, options);
        },
        onerror: (e) => {
          const message = e instanceof Error ? e.message : 'Unknown Gemini error';
          options.callbacks.onError(new Error(message));
        },
        onclose: () => {
          options.callbacks.onClose();
        },
      },
    });

    return this.buildSessionWrapper(session);
  }

  private handleMessage(message: unknown, options: GeminiSessionOptions): void {
    if (!isGeminiMessage(message)) {
      return;
    }

    if (message.toolCall?.functionCalls !== undefined) {
      options.callbacks.onToolCall([...message.toolCall.functionCalls]);
      return;
    }

    this.handleServerContent(message.serverContent, options);
  }

  private handleServerContent(
    content: GeminiRawMessage['serverContent'],
    options: GeminiSessionOptions,
  ): void {
    if (content === undefined) {
      return;
    }

    if (content.interrupted === true) {
      options.callbacks.onInterrupted();
      return;
    }
    if (content.turnComplete === true) {
      options.callbacks.onTurnComplete();
      return;
    }

    if (content.modelTurn?.parts === undefined) {
      return;
    }

    for (const part of content.modelTurn.parts) {
      if (part.inlineData?.data !== undefined) {
        options.callbacks.onAudioData(part.inlineData.data);
      }
    }
  }

  private buildSessionWrapper(session: Session): GeminiLiveSession {
    return {
      sendAudio: (base64Audio: string) => {
        session.sendRealtimeInput({ audio: { data: base64Audio, mimeType: AUDIO_MIME_TYPE } });
      },
      sendToolResponse: (responses: readonly GeminiToolResponse[]) => {
        session.sendToolResponse({
          functionResponses: responses.map((r) => ({
            id: r.id,
            name: r.name,
            response: r.response,
          })),
        });
      },
      close: () => {
        session.close();
      },
    };
  }
}
