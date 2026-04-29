import { Injectable, Logger } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { AiService } from "../ai/ai.service.js";
import { config } from "../config/app.config.js";
import {
  buildMilestoneSystemPrompt,
  buildMilestoneUserPrompt,
} from "./prompts/milestone-prompts.js";
import {
  buildWeeklyPlanSystemPrompt,
  buildWeeklyPlanUserPrompt,
} from "./prompts/weekly-plan-prompts.js";
import {
  buildWeeklyTasksSystemPrompt,
  buildWeeklyTasksUserPrompt,
} from "./prompts/weekly-task-prompts.js";
import type { AssembledContext } from "./types/context.types.js";
import { GeneratedMilestone } from "./types/generated-milestone.types.js";
import { GeneratedWeeklyPlan } from "./types/generated-weekly-plan.types.js";
import { GeneratedWeeklyTask } from "./types/generated-weekly-task.types.js";
import type {
  GenerateWeeklyPlanParams,
  GenerateWeeklyTasksParams,
  MetadataParams,
  RetryParams,
} from "./types/generation.types.js";
import type { GenerationMetadata, GoalData } from "./types/roadmap.types.js";

const MAX_GENERATION_ATTEMPTS = 2;
const FIRST_ORDER_INDEX = 1;

@Injectable()
export class RoadmapGenerationService {
  private readonly logger = new Logger(RoadmapGenerationService.name);

  constructor(private readonly aiService: AiService) {}

  public async generateMilestones(
    context: AssembledContext,
    goal: GoalData,
    language: string,
  ): Promise<{
    milestones: GeneratedMilestone[];
    metadata: GenerationMetadata;
  }> {
    const model = this.resolveModel(config.roadmap.milestoneModel);
    const result = await this.generateWithRetry({
      systemPrompt: buildMilestoneSystemPrompt(language),
      userPrompt: buildMilestoneUserPrompt(context, goal),
      model,
      totalChunks: context.totalChunks,
      label: "Milestone",
      validate: validateMilestones,
    });
    return {
      milestones: result.milestones as GeneratedMilestone[],
      metadata: result.metadata,
    };
  }

  public async generateWeeklyPlan(
    params: GenerateWeeklyPlanParams,
  ): Promise<{ plan: GeneratedWeeklyPlan; metadata: GenerationMetadata }> {
    const model = this.resolveModel(config.roadmap.weeklyModel);
    const result = await this.generateWithRetry({
      systemPrompt: buildWeeklyPlanSystemPrompt(params.language),
      userPrompt: buildWeeklyPlanUserPrompt({
        context: params.context,
        milestone: params.milestone,
        weekNumber: params.weekNumber,
        generationContext: params.generationContext,
      }),
      model,
      totalChunks: params.context.totalChunks,
      label: "Weekly plan",
      validate: validateWeeklyPlan,
    });
    return {
      plan: result.milestones as GeneratedWeeklyPlan,
      metadata: result.metadata,
    };
  }

  public async generateWeeklyTasks(params: GenerateWeeklyTasksParams): Promise<{
    tasks: GeneratedWeeklyTask[];
    metadata: GenerationMetadata;
  }> {
    const model = this.resolveModel(config.roadmap.weeklyTaskModel);
    const result = await this.generateWithRetry({
      systemPrompt: buildWeeklyTasksSystemPrompt(params.language),
      userPrompt: buildWeeklyTasksUserPrompt({
        weeklyPlan: params.weeklyPlan,
        context: params.context,
        weekData: params.weekData,
      }),
      model,
      totalChunks: params.context.totalChunks,
      label: "Weekly tasks",
      validate: validateWeeklyTasks,
    });
    return {
      tasks: result.milestones as GeneratedWeeklyTask[],
      metadata: result.metadata,
    };
  }

  private resolveModel(configModel: string): string {
    return configModel === "default" ? config.ai.defaultModel : configModel;
  }

  private async generateWithRetry(
    params: RetryParams,
  ): Promise<{ milestones: unknown; metadata: GenerationMetadata }> {
    const startTime = Date.now();
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      try {
        const { data, usage } = await this.aiService.generateJson<unknown>(
          params.systemPrompt,
          params.userPrompt,
          params.model,
          config.roadmap.reasoningEffort,
          config.roadmap.callTimeoutMs,
        );
        const validated = params.validate(data);
        return {
          milestones: validated,
          metadata: {
            ...this.buildMetadata({
              model: params.model,
              startTime,
              totalChunks: params.totalChunks,
              attempt,
            }),
            prompt_tokens: usage?.promptTokens,
            completion_tokens: usage?.completionTokens,
          },
        };
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `${params.label} generation attempt ${String(attempt + 1)} failed: ${lastError.message}`,
        );
      }
    }
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw lastError;
  }

  private buildMetadata(params: MetadataParams): GenerationMetadata {
    return {
      model_used: params.model,
      latency_ms: Date.now() - params.startTime,
      context_chunks_used: params.totalChunks,
      attempts: params.attempt + 1,
    };
  }
}

function validateMilestones(raw: unknown): GeneratedMilestone[] {
  const items = Array.isArray(raw) ? raw : [raw];
  const instances = plainToInstance(GeneratedMilestone, items);
  const errors = instances.flatMap((i) => validateSync(i as object));

  if (errors.length === 0) {
    return normalizeMilestones(instances);
  }

  return repairMilestones(items);
}

function normalizeMilestones(
  milestones: GeneratedMilestone[],
): GeneratedMilestone[] {
  return milestones.map((m) =>
    plainToInstance(GeneratedMilestone, {
      title: m.title,
      description: m.description,
      expected_outcome: m.expected_outcome,
      order_index: m.order_index,
      is_monthly_checkpoint: false,
    }),
  );
}

function repairMilestones(items: unknown[]): GeneratedMilestone[] {
  const cleaned = items.map((item) => {
    const rec = item as Record<string, unknown>;
    return {
      title: typeof rec.title === "string" ? rec.title : "",
      description: typeof rec.description === "string" ? rec.description : "",
      expected_outcome:
        typeof rec.expected_outcome === "string" ? rec.expected_outcome : "",
      is_monthly_checkpoint: Boolean(rec.is_monthly_checkpoint),
      order_index: Number(rec.order_index),
    };
  });
  const repairedInstances = plainToInstance(GeneratedMilestone, cleaned);
  const repairErrors = repairedInstances.flatMap((i) =>
    validateSync(i as object),
  );

  if (repairErrors.length === 0) {
    return normalizeMilestones(repairedInstances);
  }

  throw new Error(
    `Milestone validation failed after repair: ${repairErrors.map((e) => e.toString()).join(", ")}`,
  );
}

function validateWeeklyPlan(raw: unknown): GeneratedWeeklyPlan {
  const data =
    typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw : {};
  const instance = plainToInstance(GeneratedWeeklyPlan, data);
  const errors = validateSync(instance as object);

  if (errors.length === 0) {
    return instance;
  }

  return repairWeeklyPlan(data);
}

function repairWeeklyPlan(data: unknown): GeneratedWeeklyPlan {
  const rec = data as Record<string, unknown>;
  const cleaned = {
    objectives: Array.isArray(rec.objectives)
      ? (rec.objectives as unknown[]).map(String)
      : [],
  };
  const repairedInstance = plainToInstance(GeneratedWeeklyPlan, cleaned);
  const repairErrors = validateSync(repairedInstance as object);

  if (repairErrors.length === 0) {
    return repairedInstance;
  }

  throw new Error(
    `Weekly plan validation failed after repair: ${repairErrors.map((e) => e.toString()).join(", ")}`,
  );
}

function validateWeeklyTasks(raw: unknown): GeneratedWeeklyTask[] {
  const items = Array.isArray(raw) ? raw : [raw];
  const instances = plainToInstance(GeneratedWeeklyTask, items);
  const errors = instances.flatMap((i) => validateSync(i as object));

  if (errors.length === 0) {
    return instances;
  }

  return repairWeeklyTasks(items);
}

function repairWeeklyTasks(items: unknown[]): GeneratedWeeklyTask[] {
  const cleaned = items.map((item, idx) => {
    const rec = item as Record<string, unknown>;
    return {
      title: typeof rec.title === "string" ? rec.title : "",
      description: typeof rec.description === "string" ? rec.description : "",
      order_index: Number(rec.order_index) || idx + FIRST_ORDER_INDEX,
      difficulty_rating: rec.difficulty_rating,
    };
  });
  const repairedInstances = plainToInstance(GeneratedWeeklyTask, cleaned);
  const repairErrors = repairedInstances.flatMap((i) =>
    validateSync(i as object),
  );

  if (repairErrors.length === 0) {
    return repairedInstances;
  }

  throw new Error(
    `Weekly tasks validation failed after repair: ${repairErrors.map((e) => e.toString()).join(", ")}`,
  );
}
