import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

import { ChatHistoryService } from '../chat/chat-history.service.js';
import { ChatPromptService } from '../chat/chat-prompt.service.js';
import { CoachService } from '../coach/coach.service.js';
import { VoiceChatSessionStore } from './voice-chat-session.store.js';

interface CreateSessionResult {
  signedUrl: string;
  conversationId: string;
  sessionId: string;
  sessionSecret: string;
  overrides: SessionOverrides;
}

interface SessionOverrides {
  prompt: string;
  language: string;
  voiceId: string;
}

@Injectable()
export class VoiceChatTokenService {
  private readonly logger = new Logger(VoiceChatTokenService.name);

  constructor(
    private readonly chatHistoryService: ChatHistoryService,
    private readonly chatPromptService: ChatPromptService,
    private readonly coachService: CoachService,
    private readonly sessionStore: VoiceChatSessionStore,
    private readonly configService: ConfigService,
  ) {}

  async createSession(
    userId: string,
    goalId: string,
    conversationId?: string,
  ): Promise<CreateSessionResult> {
    const resolvedConversationId = await this.resolveConversationId(
      userId,
      goalId,
      conversationId,
    );

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

    const signedUrl = await this.fetchSignedUrl();

    const sessionSecret = randomUUID();
    const sessionId = await this.sessionStore.create(
      userId,
      goalId,
      resolvedConversationId,
      sessionSecret,
    );

    void this.sessionStore.purgeStale();

    const overrides: SessionOverrides = {
      prompt: systemPrompt,
      language: profile.language,
      voiceId: coach.elevenlabs_voice_id,
    };

    return {
      signedUrl,
      conversationId: resolvedConversationId,
      sessionId,
      sessionSecret,
      overrides,
    };
  }

  private async resolveConversationId(
    userId: string,
    goalId: string,
    conversationId?: string,
  ): Promise<string> {
    if (conversationId) {
      await this.chatHistoryService.getConversation(conversationId, userId);
      return conversationId;
    }

    const conversation = await this.chatHistoryService.createConversation(
      userId,
      goalId,
    );
    return conversation.id;
  }

  private async fetchSignedUrl(): Promise<string> {
    const apiKey =
      this.configService.getOrThrow<string>('ELEVENLABS_API_KEY');
    const agentId =
      this.configService.getOrThrow<string>('ELEVENLABS_AGENT_ID');

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        headers: { 'xi-api-key': apiKey },
      },
    );

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `ElevenLabs signed URL request failed: ${String(response.status)} ${body}`,
      );
      throw new BadRequestException('Failed to create voice session');
    }

    const data = (await response.json()) as { signed_url: string };
    return data.signed_url;
  }
}
