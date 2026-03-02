import type { ChatToolEntry, ChatToolExecutor } from './types/chat.types.js';
import type { ChatToolsService } from './chat-tools.service.js';

function createToolEntry(
  name: string,
  description: string,
  executor: ChatToolExecutor,
): ChatToolEntry {
  return {
    definition: {
      type: 'function' as const,
      function: {
        name,
        description,
        parameters: { type: 'object' as const, properties: {}, required: [] },
      },
    },
    executor,
  };
}

export function buildToolRegistry(toolsService: ChatToolsService): Map<string, ChatToolEntry> {
  const registry = new Map<string, ChatToolEntry>();

  registry.set(
    'getDailyObjectives',
    createToolEntry(
      'getDailyObjectives',
      "Fetch today's daily objectives for the user's active goal. Returns the list of tasks with title, description, completion status, and difficulty rating.",
      (async (_args, ctx) => toolsService.getDailyObjectives(ctx)) satisfies ChatToolExecutor,
    ),
  );

  registry.set(
    'getWeeklyPlan',
    createToolEntry(
      'getWeeklyPlan',
      "Fetch the current active weekly plan. Returns the week's focus statement, objective list, and completion status.",
      (async (_args, ctx) => toolsService.getWeeklyPlan(ctx)) satisfies ChatToolExecutor,
    ),
  );

  registry.set(
    'getMilestones',
    createToolEntry(
      'getMilestones',
      "Fetch all milestones in the user's long-term roadmap. Returns milestone titles, descriptions, expected outcomes, and target months.",
      (async (_args, ctx) => toolsService.getMilestones(ctx)) satisfies ChatToolExecutor,
    ),
  );

  return registry;
}
