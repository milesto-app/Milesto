import {
  buildCheckInTools,
  buildRoadmapTools,
} from './chat-checkin-registry.js';
import type { ChatCheckInToolsService } from './chat-checkin-tools.service.js';
import type { ChatRoadmapToolsService } from './chat-roadmap-tools.service.js';
import type { ChatToolsService } from './chat-tools.service.js';
import type { ChatToolEntry, ChatToolExecutor } from './types/chat.types.js';

export interface ToolRegistryDeps {
  toolsService: ChatToolsService;
  checkInToolsService: ChatCheckInToolsService;
  roadmapToolsService: ChatRoadmapToolsService;
}

interface ToolConfig {
  name: string;
  description: string;
  executor: ChatToolExecutor;
  parameters?: { properties: Record<string, unknown>; required: string[] };
}

function createToolEntry(config: ToolConfig): ChatToolEntry {
  return {
    definition: {
      type: 'function' as const,
      function: {
        name: config.name,
        description: config.description,
        parameters: {
          type: 'object' as const,
          properties: config.parameters?.properties ?? {},
          required: config.parameters?.required ?? [],
        },
      },
    },
    executor: config.executor,
  };
}

export function buildToolRegistry(
  deps: ToolRegistryDeps,
): Map<string, ChatToolEntry> {
  const registry = new Map<string, ChatToolEntry>();

  const entries: ToolConfig[] = [
    ...buildObjectiveTools(deps.toolsService),
    ...buildMemoryTools(deps.toolsService),
    ...buildStatsTools(deps.toolsService),
    ...buildSearchTools(deps.toolsService),
    ...buildCheckInTools(deps.checkInToolsService),
    ...buildRoadmapTools(deps.roadmapToolsService),
  ];
  for (const entry of entries) {
    registry.set(entry.name, createToolEntry(entry));
  }

  return registry;
}

function buildObjectiveTools(toolsService: ChatToolsService): ToolConfig[] {
  return [
    {
      name: 'getDailyObjectives',
      description:
        "Fetch today's daily objectives. Returns array of {id, title, description, is_completed, difficulty_rating}.",
      executor: (async (_args, ctx) =>
        toolsService.getDailyObjectives(ctx)) satisfies ChatToolExecutor,
    },
    {
      name: 'toggleObjectiveCompletion',
      description: "Toggle a daily objective's completion status.",
      executor: (async (args, ctx) =>
        toolsService.toggleObjectiveCompletion(
          args,
          ctx,
        )) satisfies ChatToolExecutor,
      parameters: {
        properties: {
          objectiveId: {
            type: 'string',
            description: 'UUID of the daily objective',
          },
          isCompleted: {
            type: 'boolean',
            description: 'New completion status',
          },
        },
        required: ['objectiveId', 'isCompleted'],
      },
    },
  ];
}

function buildMemoryTools(toolsService: ChatToolsService): ToolConfig[] {
  return [
    {
      name: 'editMemory',
      description:
        'Replace the stored coach memory with new content. Expects the complete updated text.',
      executor: (async (args, ctx) =>
        toolsService.editMemory(args, ctx)) satisfies ChatToolExecutor,
      parameters: {
        properties: {
          content: {
            type: 'string',
            description:
              'The full updated memory content to save, replacing any previous memory.',
          },
        },
        required: ['content'],
      },
    },
    {
      name: 'saveInsight',
      description:
        'Save a single atomic observation about the user. Duplicates are auto-detected.',
      executor: (async (args, ctx) =>
        toolsService.saveInsight(args, ctx)) satisfies ChatToolExecutor,
      parameters: {
        properties: {
          insight: {
            type: 'string',
            description:
              'A single atomic insight about the user. Be specific and concise.',
          },
        },
        required: ['insight'],
      },
    },
  ];
}

function buildStatsTools(toolsService: ChatToolsService): ToolConfig[] {
  return [
    {
      name: 'getProgressStats',
      description:
        'Fetch weekly progress: completed count, total count, completion rate, week number.',
      executor: (async (_args, ctx) =>
        toolsService.getProgressStats(ctx)) satisfies ChatToolExecutor,
    },
  ];
}

function buildSearchTools(toolsService: ChatToolsService): ToolConfig[] {
  return [
    {
      name: 'searchContext',
      description:
        "Search the user's stored context (intake answers, goal profile, summaries, debrief notes, insights).",
      executor: (async (args, ctx) =>
        toolsService.searchContext(args, ctx)) satisfies ChatToolExecutor,
      parameters: {
        properties: {
          query: {
            type: 'string',
            description:
              'The search query describing what information to find.',
          },
          contentTypes: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Optional filter by content type: intake_answer, goal_profile, user_profile, weekly_summary, debrief_note, coach_insight.',
          },
        },
        required: ['query'],
      },
    },
  ];
}
