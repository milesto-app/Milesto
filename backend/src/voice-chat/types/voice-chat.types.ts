import type { FunctionDeclaration } from '@google/genai';

export interface GeminiSessionOptions {
  readonly systemInstruction: string;
  readonly voiceName: string;
  readonly tools: FunctionDeclaration[];
  readonly callbacks: GeminiSessionCallbacks;
}

export interface GeminiSessionCallbacks {
  readonly onAudioData: (base64Audio: string) => void;
  readonly onToolCall: (calls: readonly GeminiFunctionCall[]) => void;
  readonly onInterrupted: () => void;
  readonly onTurnComplete: () => void;
  readonly onError: (error: Error) => void;
  readonly onClose: () => void;
}

export interface GeminiFunctionCall {
  readonly id: string;
  readonly name: string;
  readonly args: Record<string, unknown>;
}

export interface GeminiToolResponse {
  readonly id: string;
  readonly name: string;
  readonly response: Record<string, unknown>;
}

export interface GeminiLiveSession {
  sendAudio(base64Audio: string): void;
  sendToolResponse(responses: readonly GeminiToolResponse[]): void;
  close(): void;
}

export type WsClientMessage =
  | { readonly type: 'start_session'; readonly goalId: string; readonly conversationId?: string }
  | { readonly type: 'audio_data'; readonly data: string };

export type WsServerMessage =
  | { readonly type: 'session_started'; readonly conversationId: string }
  | { readonly type: 'audio_data'; readonly data: string }
  | { readonly type: 'tool_start'; readonly toolName: string }
  | { readonly type: 'tool_end'; readonly toolName: string; readonly result: unknown }
  | { readonly type: 'interrupted' }
  | { readonly type: 'turn_complete' }
  | { readonly type: 'session_warning'; readonly remainingMs: number }
  | { readonly type: 'session_expired' }
  | { readonly type: 'error'; readonly message: string };
