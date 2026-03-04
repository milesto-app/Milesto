import { Module } from '@nestjs/common';

import { ChatModule } from '../chat/chat.module.js';
import { CoachModule } from '../coach/coach.module.js';
import { GeminiLiveService } from './gemini-live.service.js';
import { VoiceChatAuthService } from './voice-chat-auth.service.js';
import { VoiceChatGateway } from './voice-chat.gateway.js';
import { VoiceChatSessionService } from './voice-chat-session.service.js';

@Module({
  imports: [ChatModule, CoachModule],
  providers: [
    GeminiLiveService,
    VoiceChatAuthService,
    VoiceChatSessionService,
    VoiceChatGateway,
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class VoiceChatModule {}
