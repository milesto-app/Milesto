import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { ChatHistoryService } from '../chat/chat-history.service.js';
import { ElevenLabsWebhookAuthGuard } from './guards/elevenlabs-webhook-auth.guard.js';
import { VoiceChatSessionStore } from './voice-chat-session.store.js';

interface TranscriptTurn {
  role: string;
  message: string;
}

interface TranscriptWebhookBody {
  conversation_id: string;
  transcript: TranscriptTurn[];
}

@ApiTags('voice-chat')
@Controller('voice-chat')
@SkipThrottle()
export class VoiceChatTranscriptController {
  private readonly logger = new Logger(VoiceChatTranscriptController.name);

  constructor(
    private readonly sessionStore: VoiceChatSessionStore,
    private readonly chatHistoryService: ChatHistoryService,
  ) {}

  @Post('transcript')
  @UseGuards(ElevenLabsWebhookAuthGuard)
  @ApiOperation({ summary: 'Receive transcript webhook from ElevenLabs' })
  @ApiResponse({ status: 200, description: 'Transcript processed' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  public async receiveTranscript(
    @Body() body: TranscriptWebhookBody,
  ): Promise<{ status: string }> {
    const session = await this.sessionStore.findByElevenLabsConversationId(
      body.conversation_id,
    );

    if (!session) {
      this.logger.warn(
        `No session found for ElevenLabs conversation ${body.conversation_id}`,
      );
      return { status: 'ok' };
    }

    const turns = body.transcript;

    for (const [index, turn] of turns.entries()) {
      const role = turn.role === 'agent' ? 'assistant' : 'user';
      try {
        await this.chatHistoryService.storeVoiceMessage(
          session.conversationId,
          {
            role: role,
            content: turn.message,
            source_type: 'voice',
            voice_session_id: session.id,
            turn_index: index,
          },
        );
      } catch (error) {
        this.logger.error(
          `Failed to upsert transcript turn ${String(index)}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    await this.sessionStore.markTranscriptStored(session.id);

    return { status: 'ok' };
  }
}
