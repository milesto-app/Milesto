import type { ChatToolEntry, ChatToolExecutor } from './types/chat.types.js';
import type { ChatToolsService } from './chat-tools.service.js';

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

export function buildToolRegistry(toolsService: ChatToolsService): Map<string, ChatToolEntry> {
  const registry = new Map<string, ChatToolEntry>();

  const entries: ToolConfig[] = [
    ...buildObjectiveTools(toolsService),
    ...buildCoachTools(toolsService),
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
        "Fetch today's daily objectives for the user's active goal. Returns tasks with id, title, description, completion status, and difficulty.",
      executor: (async (_args, ctx) =>
        toolsService.getDailyObjectives(ctx)) satisfies ChatToolExecutor,
    },
    {
      name: 'toggleObjectiveCompletion',
      description:
        'Mark a daily objective as completed or not completed. Use the objective ID from getDailyObjectives.',
      executor: (async (args, ctx) =>
        toolsService.toggleObjectiveCompletion(args, ctx)) satisfies ChatToolExecutor,
      parameters: {
        properties: {
          objectiveId: { type: 'string', description: 'UUID of the daily objective' },
          isCompleted: { type: 'boolean', description: 'New completion status' },
        },
        required: ['objectiveId', 'isCompleted'],
      },
    },
  ];
}

function buildCoachTools(toolsService: ChatToolsService): ToolConfig[] {
  return [
    {
      name: 'getProgressStats',
      description:
        "Fetch the user's weekly progress stats including completed tasks count, total tasks, and completion rate.",
      executor: (async (_args, ctx) =>
        toolsService.getProgressStats(ctx)) satisfies ChatToolExecutor,
    },
    {
      name: 'editMemory',
      description:
        'Save or update your personal notes about this user and their goal. Send the complete updated memory — not just the new part. Use this to remember preferences, obstacles, strategies, and breakthroughs.',
      executor: (async (args, ctx) =>
        toolsService.editMemory(args, ctx)) satisfies ChatToolExecutor,
      parameters: {
        properties: {
          content: {
            type: 'string',
            description: 'The full updated memory content to save, replacing any previous memory.',
          },
        },
        required: ['content'],
      },
    },
  ];
}
