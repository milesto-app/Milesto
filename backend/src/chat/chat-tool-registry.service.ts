import { Injectable } from '@nestjs/common';

import { ChatCheckInToolsService } from './chat-checkin-tools.service.js';
import { ChatRoadmapToolsService } from './chat-roadmap-tools.service.js';
import { buildToolRegistry } from './chat-tool-registry.js';
import { ChatToolsService } from './chat-tools.service.js';
import type { ChatToolEntry } from './types/chat.types.js';

@Injectable()
export class ChatToolRegistryService {
  constructor(
    private readonly toolsService: ChatToolsService,
    private readonly checkInToolsService: ChatCheckInToolsService,
    private readonly roadmapToolsService: ChatRoadmapToolsService,
  ) {}

  getRegistry(): Map<string, ChatToolEntry> {
    return buildToolRegistry({
      toolsService: this.toolsService,
      checkInToolsService: this.checkInToolsService,
      roadmapToolsService: this.roadmapToolsService,
    });
  }
}
