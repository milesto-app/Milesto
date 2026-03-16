import type { ChatDebriefToolsService } from './chat-debrief-tools.service.js';
import type { ChatRoadmapToolsService } from './chat-roadmap-tools.service.js';
import type { ChatToolExecutor } from './types/chat.types.js';

interface ToolConfig {
  name: string;
  description: string;
  executor: ChatToolExecutor;
  parameters?: { properties: Record<string, unknown>; required: string[] };
}

export function buildDebriefTools(
  toolsService: ChatDebriefToolsService,
): ToolConfig[] {
  return [buildSubmitDebriefTool(toolsService)];
}

function buildSubmitDebriefTool(
  toolsService: ChatDebriefToolsService,
): ToolConfig {
  return {
    name: 'submitDebrief',
    description: "Log the user's end-of-week reflection and debrief.",
    executor: (async (args, ctx) =>
      toolsService.submitDebrief(args, ctx)) satisfies ChatToolExecutor,
    parameters: {
      properties: {
        weekly_plan_id: {
          type: 'string',
          description: 'UUID of the weekly plan being debriefed.',
        },
        note: {
          type: 'string',
          description: "The user's end-of-week reflection note.",
        },
      },
      required: ['weekly_plan_id', 'note'],
    },
  };
}

export function buildRoadmapTools(
  toolsService: ChatRoadmapToolsService,
): ToolConfig[] {
  return [
    {
      name: 'getRoadmap',
      description: 'Fetch the full milestone roadmap with current progress.',
      executor: (async (_args, ctx) =>
        toolsService.getRoadmap(ctx)) satisfies ChatToolExecutor,
    },
  ];
}
