import { Injectable } from "@nestjs/common";

import { ChatDebriefToolsService } from "./chat-debrief-tools.service.js";
import { ChatRoadmapToolsService } from "./chat-roadmap-tools.service.js";
import { ChatToolsService } from "./chat-tools.service.js";
import type { ChatToolEntry, ChatToolExecutor } from "./types/chat.types.js";

interface ToolConfig {
  name: string;
  description: string;
  executor: ChatToolExecutor;
  parameters?: { properties: Record<string, unknown>; required: string[] };
}

@Injectable()
export class ChatToolRegistryService {
  constructor(
    private readonly toolsService: ChatToolsService,
    private readonly debriefToolsService: ChatDebriefToolsService,
    private readonly roadmapToolsService: ChatRoadmapToolsService,
  ) {}

  public getRegistry(): Map<string, ChatToolEntry> {
    const registry = new Map<string, ChatToolEntry>();

    const entries: ToolConfig[] = [
      ...this.buildTaskTools(),
      ...this.buildMemoryTools(),
      ...this.buildStatsTools(),
      ...this.buildSearchTools(),
      ...this.buildDebriefTools(),
      ...this.buildRoadmapTools(),
    ];
    for (const entry of entries) {
      registry.set(entry.name, createToolEntry(entry));
    }

    return registry;
  }

  private buildTaskTools(): ToolConfig[] {
    return [
      {
        name: "getTasks",
        description:
          "Fetch the active milestone's tasks. Returns array of {id, title, description, is_completed, estimated_minutes}.",
        executor: (async (_args, ctx) =>
          this.toolsService.getTasks(ctx)) satisfies ChatToolExecutor,
      },
      {
        name: "toggleTaskCompletion",
        description: "Toggle a task's completion status.",
        executor: (async (args, ctx) =>
          this.toolsService.toggleTaskCompletion(
            args,
            ctx,
          )) satisfies ChatToolExecutor,
        parameters: {
          properties: {
            taskId: {
              type: "string",
              description: "UUID of the task",
            },
            isCompleted: {
              type: "boolean",
              description: "New completion status",
            },
          },
          required: ["taskId", "isCompleted"],
        },
      },
    ];
  }

  private buildMemoryTools(): ToolConfig[] {
    return [
      {
        name: "editMemory",
        description:
          "Replace the stored coach memory with new content. Expects the complete updated text.",
        executor: (async (args, ctx) =>
          this.toolsService.editMemory(args, ctx)) satisfies ChatToolExecutor,
        parameters: {
          properties: {
            content: {
              type: "string",
              description:
                "The full updated memory content to save, replacing any previous memory.",
            },
          },
          required: ["content"],
        },
      },
      {
        name: "saveInsight",
        description:
          "Save a single atomic observation about the user. Duplicates are auto-detected.",
        executor: (async (args, ctx) =>
          this.toolsService.saveInsight(args, ctx)) satisfies ChatToolExecutor,
        parameters: {
          properties: {
            insight: {
              type: "string",
              description:
                "A single atomic insight about the user. Be specific and concise.",
            },
          },
          required: ["insight"],
        },
      },
    ];
  }

  private buildStatsTools(): ToolConfig[] {
    return [
      {
        name: "getProgressStats",
        description:
          "Fetch weekly progress: completed count, total count, completion rate, week number.",
        executor: (async (_args, ctx) =>
          this.toolsService.getProgressStats(ctx)) satisfies ChatToolExecutor,
      },
    ];
  }

  private buildSearchTools(): ToolConfig[] {
    return [
      {
        name: "searchContext",
        description:
          "Search the user's stored context (intake answers, goal profile, summaries, debrief notes, insights).",
        executor: (async (args, ctx) =>
          this.toolsService.searchContext(
            args,
            ctx,
          )) satisfies ChatToolExecutor,
        parameters: {
          properties: {
            query: {
              type: "string",
              description:
                "The search query describing what information to find.",
            },
            contentTypes: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional filter by content type: intake_answer, goal_profile, user_profile, weekly_summary, debrief_note, coach_insight.",
            },
          },
          required: ["query"],
        },
      },
    ];
  }

  private buildDebriefTools(): ToolConfig[] {
    return [
      {
        name: "submitDebrief",
        description: "Log the user's end-of-week reflection and debrief.",
        executor: (async (args, ctx) =>
          this.debriefToolsService.submitDebrief(
            args,
            ctx,
          )) satisfies ChatToolExecutor,
        parameters: {
          properties: {
            milestone_id: {
              type: "string",
              description: "UUID of the milestone being debriefed.",
            },
            note: {
              type: "string",
              description: "The user's end-of-week reflection note.",
            },
          },
          required: ["milestone_id", "note"],
        },
      },
    ];
  }

  private buildRoadmapTools(): ToolConfig[] {
    return [
      {
        name: "getRoadmap",
        description: "Fetch the full milestone roadmap with current progress.",
        executor: (async (_args, ctx) =>
          this.roadmapToolsService.getRoadmap(ctx)) satisfies ChatToolExecutor,
      },
    ];
  }
}

function createToolEntry(config: ToolConfig): ChatToolEntry {
  return {
    definition: {
      type: "function" as const,
      function: {
        name: config.name,
        description: config.description,
        parameters: {
          type: "object" as const,
          properties: config.parameters?.properties ?? {},
          required: config.parameters?.required ?? [],
        },
      },
    },
    executor: config.executor,
  };
}
