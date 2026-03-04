import type { ChatCheckInToolsService } from './chat-checkin-tools.service.js';
import type { ChatRoadmapToolsService } from './chat-roadmap-tools.service.js';
import type { ChatToolExecutor } from './types/chat.types.js';

interface ToolConfig {
  name: string;
  description: string;
  executor: ChatToolExecutor;
  parameters?: { properties: Record<string, unknown>; required: string[] };
}

export function buildCheckInTools(
  toolsService: ChatCheckInToolsService,
): ToolConfig[] {
  return [
    buildSubmitCheckInTool(toolsService),
    buildSubmitDebriefTool(toolsService),
  ];
}

function buildSubmitCheckInTool(
  toolsService: ChatCheckInToolsService,
): ToolConfig {
  return {
    name: 'submitCheckIn',
    description: "Log the user's morning energy check-in for today.",
    executor: (async (args, ctx) =>
      toolsService.submitCheckIn(args, ctx)) satisfies ChatToolExecutor,
    parameters: {
      properties: {
        energy_level: {
          type: 'string',
          description: "The user's energy level.",
          enum: ['high', 'good', 'low', 'very_low'],
        },
        note: {
          type: 'string',
          description: 'Optional note about how the user is feeling.',
        },
      },
      required: ['energy_level'],
    },
  };
}

function buildSubmitDebriefTool(
  toolsService: ChatCheckInToolsService,
): ToolConfig {
  return {
    name: 'submitDebrief',
    description: "Log the user's end-of-day reflection for today.",
    executor: (async (args, ctx) =>
      toolsService.submitDebrief(args, ctx)) satisfies ChatToolExecutor,
    parameters: {
      properties: {
        note: {
          type: 'string',
          description: "The user's end-of-day reflection note.",
        },
      },
      required: ['note'],
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
