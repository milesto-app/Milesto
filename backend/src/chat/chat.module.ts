import { Module } from '@nestjs/common';
import { CoachModule } from '../coach/coach.module.js';
import { RoadmapModule } from '../roadmap/roadmap.module.js';
import { ChatAiService } from './chat-ai.service.js';
import { ChatController } from './chat.controller.js';
import { ChatHistoryService } from './chat-history.service.js';
import { ChatPromptService } from './chat-prompt.service.js';
import { ChatSearchService } from './chat-search.service.js';
import { ChatService } from './chat.service.js';
import { ChatToolsService } from './chat-tools.service.js';
import { ChatCheckInToolsService } from './chat-checkin-tools.service.js';
import { ChatRoadmapToolsService } from './chat-roadmap-tools.service.js';

@Module({
  imports: [CoachModule, RoadmapModule],
  controllers: [ChatController],
  providers: [
    ChatAiService,
    ChatHistoryService,
    ChatSearchService,
    ChatToolsService,
    ChatCheckInToolsService,
    ChatRoadmapToolsService,
    ChatPromptService,
    ChatService,
  ],
  exports: [
    ChatHistoryService,
    ChatToolsService,
    ChatCheckInToolsService,
    ChatRoadmapToolsService,
    ChatPromptService,
    ChatService,
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ChatModule {}
