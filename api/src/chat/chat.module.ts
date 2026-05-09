import { Module } from "@nestjs/common";

import { DebriefModule } from "../debrief/debrief.module.js";
import { RoadmapModule } from "../roadmap/roadmap.module.js";
import { UsageModule } from "../usage/usage.module.js";
import { WeeklyTaskModule } from "../weekly-task/weekly-task.module.js";
import { ChatController } from "./chat.controller.js";
import { ChatService } from "./chat.service.js";
import { ChatDebriefToolsService } from "./chat-debrief-tools.service.js";
import { ChatHistoryService } from "./chat-history.service.js";
import { ChatPromptService } from "./chat-prompt.service.js";
import { ChatRoadmapToolsService } from "./chat-roadmap-tools.service.js";
import { ChatSearchService } from "./chat-search.service.js";
import { ChatToolRegistryService } from "./chat-tool-registry.service.js";
import { ChatToolsService } from "./chat-tools.service.js";
import { ConversationsController } from "./conversations.controller.js";

@Module({
  imports: [RoadmapModule, DebriefModule, WeeklyTaskModule, UsageModule],
  controllers: [ChatController, ConversationsController],
  providers: [
    ChatHistoryService,
    ChatSearchService,
    ChatToolsService,
    ChatDebriefToolsService,
    ChatRoadmapToolsService,
    ChatToolRegistryService,
    ChatPromptService,
    ChatService,
  ],
  exports: [
    ChatHistoryService,
    ChatToolsService,
    ChatDebriefToolsService,
    ChatRoadmapToolsService,
    ChatToolRegistryService,
    ChatPromptService,
    ChatService,
  ],
})
export class ChatModule {}
