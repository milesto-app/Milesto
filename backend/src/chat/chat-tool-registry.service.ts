import { Injectable } from '@nestjs/common';

import { ChatDebriefToolsService } from './chat-debrief-tools.service.js';
import { ChatRoadmapToolsService } from './chat-roadmap-tools.service.js';
import { buildToolRegistry } from './chat-tool-registry.js';
import { ChatToolsService } from './chat-tools.service.js';
import type { ChatToolEntry } from './types/chat.types.js';

@Injectable()
export class ChatToolRegistryService {
  constructor(
    private readonly toolsService: ChatToolsService,
    private readonly debriefToolsService: ChatDebriefToolsService,
    private readonly roadmapToolsService: ChatRoadmapToolsService,
  ) {}

  public getRegistry(): Map<string, ChatToolEntry> {
    return buildToolRegistry({
      toolsService: this.toolsService,
      debriefToolsService: this.debriefToolsService,
      roadmapToolsService: this.roadmapToolsService,
    });
  }
}
