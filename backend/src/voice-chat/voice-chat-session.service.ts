import { Injectable, Logger } from '@nestjs/common';

import { ChatCheckInToolsService } from '../chat/chat-checkin-tools.service.js';
import { ChatHistoryService } from '../chat/chat-history.service.js';
import { ChatRoadmapToolsService } from '../chat/chat-roadmap-tools.service.js';
import { buildToolRegistry } from '../chat/chat-tool-registry.js';
import { ChatToolsService } from '../chat/chat-tools.service.js';
import type { ChatToolEntry } from '../chat/types/chat.types.js';
import type { ToolExecutionContext } from '../chat/types/chat.types.js';
import { config } from '../config/app.config.js';
import { GeminiLiveService } from './gemini-live.service.js';
import { adaptToolsToGemini } from './gemini-tool-adapter.js';
import type {
  GeminiFunctionCall,
  GeminiLiveSession,
  GeminiSessionCallbacks,
  WsServerMessage,
} from './types/voice-chat.types.js';

export interface ActiveSession {
  readonly geminiSession: GeminiLiveSession;
  readonly conversationId: string;
  readonly goalId: string;
  readonly userId: string;
  readonly warningTimer: ReturnType<typeof setTimeout>;
  readonly expiryTimer: ReturnType<typeof setTimeout>;
}

export interface CreateSessionInput {
  readonly userId: string;
  readonly goalId: string;
  readonly systemPrompt: string;
  readonly voiceName: string;
  readonly conversationId: string | undefined;
  readonly send: (msg: WsServerMessage) => void;
}

interface ToolContext {
  readonly registry: Map<string, ChatToolEntry>;
  readonly execCtx: ToolExecutionContext;
}

type SendFn = (msg: WsServerMessage) => void;

@Injectable()
export class VoiceChatSessionService {
  private readonly logger = new Logger(VoiceChatSessionService.name);
  private readonly activeSessions = new Map<string, ActiveSession>();

  constructor(
    private readonly geminiLiveService: GeminiLiveService,
    private readonly chatToolsService: ChatToolsService,
    private readonly chatCheckInToolsService: ChatCheckInToolsService,
    private readonly chatRoadmapToolsService: ChatRoadmapToolsService,
    private readonly chatHistoryService: ChatHistoryService,
  ) {}

  public hasActiveSession(userId: string): boolean {
    return this.activeSessions.has(userId);
  }

  public getSession(userId: string): ActiveSession | undefined {
    return this.activeSessions.get(userId);
  }

  public async createSession(
    input: CreateSessionInput,
  ): Promise<ActiveSession> {
    const convId = await this.resolveConversationId(input);
    const geminiSession = await this.startGeminiSession(input);

    const timers = this.createTimers(input.userId, input.send);
    const session: ActiveSession = {
      geminiSession,
      conversationId: convId,
      goalId: input.goalId,
      userId: input.userId,
      warningTimer: timers.warningTimer,
      expiryTimer: timers.expiryTimer,
    };

    this.activeSessions.set(input.userId, session);
    return session;
  }

  public destroySession(userId: string): void {
    const session = this.activeSessions.get(userId);
    if (session === undefined) {
      return;
    }

    clearTimeout(session.warningTimer);
    clearTimeout(session.expiryTimer);
    session.geminiSession.close();
    this.activeSessions.delete(userId);
    this.logger.log(`Session destroyed for user ${userId}`);
  }

  private async resolveConversationId(
    input: CreateSessionInput,
  ): Promise<string> {
    if (input.conversationId !== undefined) {
      await this.chatHistoryService.getConversation(
        input.conversationId,
        input.userId,
      );
      return input.conversationId;
    }
    const conv = await this.chatHistoryService.createConversation(
      input.userId,
      input.goalId,
    );
    return conv.id;
  }

  private async startGeminiSession(
    input: CreateSessionInput,
  ): Promise<GeminiLiveSession> {
    const registry = buildToolRegistry({
      toolsService: this.chatToolsService,
      checkInToolsService: this.chatCheckInToolsService,
      roadmapToolsService: this.chatRoadmapToolsService,
    });
    const toolCtx: ToolContext = {
      registry,
      execCtx: { userId: input.userId, goalId: input.goalId },
    };

    return this.geminiLiveService.createSession({
      systemInstruction: input.systemPrompt,
      voiceName: input.voiceName,
      tools: adaptToolsToGemini(registry),
      callbacks: this.buildCallbacks(input, toolCtx),
    });
  }

  private buildCallbacks(
    input: CreateSessionInput,
    toolCtx: ToolContext,
  ): GeminiSessionCallbacks {
    return {
      onAudioData: (data) => {
        input.send({ type: 'audio_data', data });
      },
      onToolCall: (calls) => {
        void this.executeToolCalls(calls, toolCtx, input);
      },
      onInterrupted: () => {
        input.send({ type: 'interrupted' });
      },
      onTurnComplete: () => {
        input.send({ type: 'turn_complete' });
      },
      onError: (err) => {
        this.logger.error(
          `Gemini error for ${input.userId}: ${err.message}`,
          err.stack,
        );
        input.send({ type: 'error', message: 'Voice processing error' });
      },
      onClose: () => {
        this.logger.log(`Gemini session closed for ${input.userId}`);
      },
    };
  }

  private createTimers(
    userId: string,
    send: SendFn,
  ): {
    warningTimer: ReturnType<typeof setTimeout>;
    expiryTimer: ReturnType<typeof setTimeout>;
  } {
    const remainingMs =
      config.voice.sessionDurationMs - config.voice.sessionWarningMs;
    const warningTimer = setTimeout(() => {
      send({ type: 'session_warning', remainingMs });
    }, config.voice.sessionWarningMs);

    const expiryTimer = setTimeout(() => {
      send({ type: 'session_expired' });
      this.destroySession(userId);
    }, config.voice.sessionDurationMs);

    return { warningTimer, expiryTimer };
  }

  private async executeToolCalls(
    calls: readonly GeminiFunctionCall[],
    toolCtx: ToolContext,
    input: CreateSessionInput,
  ): Promise<void> {
    const session = this.activeSessions.get(input.userId);
    if (session === undefined) {
      return;
    }

    const responses = await Promise.all(
      calls.map(async (call) => {
        input.send({ type: 'tool_start', toolName: call.name });
        const entry = toolCtx.registry.get(call.name);
        const raw =
          entry !== undefined
            ? await entry.executor(call.args, toolCtx.execCtx)
            : { error: `Unknown tool: ${call.name}` };
        const response =
          typeof raw === 'object' && raw !== null
            ? (raw as Record<string, unknown>)
            : { result: raw };
        input.send({ type: 'tool_end', toolName: call.name, result: response });
        return { id: call.id, name: call.name, response };
      }),
    );

    session.geminiSession.sendToolResponse(responses);
  }
}
