import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway } from '@nestjs/websockets';

import type { WebSocket } from 'ws';
import type { IncomingMessage } from 'http';

import { CoachService } from '../coach/coach.service.js';
import { ChatPromptService } from '../chat/chat-prompt.service.js';
import { VoiceChatAuthService } from './voice-chat-auth.service.js';
import { VoiceChatSessionService } from './voice-chat-session.service.js';
import type { WsClientMessage, WsServerMessage } from './types/voice-chat.types.js';

const WS_CLOSE_POLICY = 1008;
const MAX_MESSAGES_PER_SECOND = 50;
const RATE_LIMIT_WINDOW_MS = 1000;

@WebSocketGateway({ path: '/api/voice-chat' })
export class VoiceChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(VoiceChatGateway.name);
  private readonly clientUserMap = new Map<WebSocket, string>();
  private readonly messageTimestamps = new Map<string, number[]>();

  // eslint-disable-next-line max-params -- NestJS DI requires individual constructor params
  constructor(
    private readonly authService: VoiceChatAuthService,
    private readonly sessionService: VoiceChatSessionService,
    private readonly chatPromptService: ChatPromptService,
    private readonly coachService: CoachService,
  ) {}

  public async handleConnection(client: WebSocket, req: IncomingMessage): Promise<void> {
    const token = this.authService.extractTokenFromUrl(req.url);
    if (token === null) {
      this.closeClient(client, WS_CLOSE_POLICY, 'Missing token');
      return;
    }

    const user = await this.authService.authenticateToken(token);
    if (user === null) {
      this.closeClient(client, WS_CLOSE_POLICY, 'Invalid token');
      return;
    }

    this.clientUserMap.set(client, user.id);
    this.logger.log(`Client connected: ${user.id}`);
    client.on('message', (raw: Buffer) => void this.handleRawMessage(client, raw));
  }

  public handleDisconnect(client: WebSocket): void {
    const userId = this.clientUserMap.get(client);
    if (userId !== undefined) {
      this.sessionService.destroySession(userId);
      this.clientUserMap.delete(client);
      this.messageTimestamps.delete(userId);
      this.logger.log(`Client disconnected: ${userId}`);
    }
  }

  private async handleRawMessage(client: WebSocket, raw: Buffer): Promise<void> {
    const userId = this.clientUserMap.get(client);
    if (userId === undefined) {
      return;
    }

    if (!this.checkRateLimit(userId)) {
      this.send(client, { type: 'error', message: 'Rate limit exceeded' });
      return;
    }

    try {
      const parsed: unknown = JSON.parse(raw.toString());
      const message = this.validateClientMessage(parsed);
      if (message === null) {
        this.send(client, { type: 'error', message: 'Invalid message format' });
        return;
      }
      await this.routeMessage(client, userId, message);
    } catch {
      this.send(client, { type: 'error', message: 'Invalid message format' });
    }
  }

  private async routeMessage(
    client: WebSocket,
    userId: string,
    message: WsClientMessage,
  ): Promise<void> {
    switch (message.type) {
      case 'start_session':
        await this.handleStartSession(client, userId, message);
        break;
      case 'audio_data':
        this.handleAudioData(userId, message.data);
        break;
    }
  }

  private async handleStartSession(
    client: WebSocket,
    userId: string,
    message: { goalId: string; conversationId?: string },
  ): Promise<void> {
    if (this.sessionService.hasActiveSession(userId)) {
      this.send(client, { type: 'error', message: 'Session already active' });
      return;
    }

    const ctx = await this.buildSessionContext(userId, message.goalId);
    const session = await this.sessionService.createSession({
      userId,
      goalId: message.goalId,
      systemPrompt: ctx.systemPrompt,
      voiceName: ctx.voiceName,
      conversationId: message.conversationId,
      send: (msg: WsServerMessage): void => {
        this.send(client, msg);
      },
    });

    this.send(client, { type: 'session_started', conversationId: session.conversationId });
    this.logger.log(`Session started for ${userId}, goal ${message.goalId}`);
  }

  private async buildSessionContext(
    userId: string,
    goalId: string,
  ): Promise<{ systemPrompt: string; voiceName: string }> {
    const profile = await this.chatPromptService.getUserProfile(userId);
    const [goalContext, memory, coach] = await Promise.all([
      this.chatPromptService.fetchGoalContext(goalId, userId),
      this.chatPromptService.fetchMemory(userId, goalId),
      this.coachService.getCoach(profile.coachId),
    ]);

    const systemPrompt = await this.chatPromptService.buildSystemPrompt({
      coachId: profile.coachId,
      goalContext,
      language: profile.language,
      memory,
    });

    return { systemPrompt, voiceName: coach.google_voice_name };
  }

  private handleAudioData(userId: string, base64Audio: string): void {
    const session = this.sessionService.getSession(userId);
    if (session === undefined) {
      return;
    }
    session.geminiSession.sendAudio(base64Audio);
  }

  private validateClientMessage(parsed: unknown): WsClientMessage | null {
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const obj = parsed as Record<string, unknown>;
    if (obj.type === 'start_session' && typeof obj.goalId === 'string') {
      if (typeof obj.conversationId === 'string') {
        return { type: 'start_session', goalId: obj.goalId, conversationId: obj.conversationId };
      }
      return { type: 'start_session', goalId: obj.goalId };
    }

    if (obj.type === 'audio_data' && typeof obj.data === 'string') {
      return { type: 'audio_data', data: obj.data };
    }

    return null;
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const timestamps = this.messageTimestamps.get(userId) ?? [];
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    recent.push(now);
    this.messageTimestamps.set(userId, recent);
    return recent.length <= MAX_MESSAGES_PER_SECOND;
  }

  private send(client: WebSocket, message: WsServerMessage): void {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  private closeClient(client: WebSocket, code: number, reason: string): void {
    this.logger.warn(`Closing client: ${reason}`);
    client.close(code, reason);
  }
}
