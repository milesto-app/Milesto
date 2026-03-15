import { Module } from '@nestjs/common';

import { ChatModule } from '../chat/chat.module.js';
import { CoachModule } from '../coach/coach.module.js';
import { ElevenLabsToolAuthGuard } from './guards/elevenlabs-tool-auth.guard.js';
import { ElevenLabsWebhookAuthGuard } from './guards/elevenlabs-webhook-auth.guard.js';
import { VoiceChatSessionStore } from './voice-chat-session.store.js';
import { VoiceChatTokenController } from './voice-chat-token.controller.js';
import { VoiceChatTokenService } from './voice-chat-token.service.js';
import { VoiceChatToolsController } from './voice-chat-tools.controller.js';
import { VoiceChatTranscriptController } from './voice-chat-transcript.controller.js';

@Module({
  imports: [ChatModule, CoachModule],
  controllers: [
    VoiceChatTokenController,
    VoiceChatToolsController,
    VoiceChatTranscriptController,
  ],
  providers: [
    VoiceChatSessionStore,
    VoiceChatTokenService,
    ElevenLabsToolAuthGuard,
    ElevenLabsWebhookAuthGuard,
  ],
})
export class VoiceChatModule {}
