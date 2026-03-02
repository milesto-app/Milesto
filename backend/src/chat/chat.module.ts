import { Module } from '@nestjs/common';
import { CoachModule } from '../coach/coach.module.js';
import { RoadmapModule } from '../roadmap/roadmap.module.js';
import { ChatAiService } from './chat-ai.service.js';
import { ChatController } from './chat.controller.js';
import { ChatHistoryService } from './chat-history.service.js';
import { ChatPromptService } from './chat-prompt.service.js';
import { ChatService } from './chat.service.js';
import { ChatToolsService } from './chat-tools.service.js';

@Module({
  imports: [CoachModule, RoadmapModule],
  controllers: [ChatController],
  providers: [ChatAiService, ChatHistoryService, ChatToolsService, ChatPromptService, ChatService],
  exports: [ChatHistoryService, ChatToolsService, ChatPromptService, ChatService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ChatModule {}
