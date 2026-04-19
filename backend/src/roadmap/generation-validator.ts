import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { GeneratedMilestone } from "./types/generated-milestone.js";
import { GeneratedWeeklyPlan } from "./types/generated-weekly-plan.js";
import { GeneratedWeeklyTask } from "./types/generated-weekly-task.js";

const FIRST_ORDER_INDEX = 1;

export function validateMilestones(raw: unknown): GeneratedMilestone[] {
  const items = Array.isArray(raw) ? raw : [raw];
  const instances = plainToInstance(GeneratedMilestone, items);
  const errors = instances.flatMap((i) => validateSync(i as object));

  if (errors.length === 0) {
    return instances;
  }

  return repairMilestones(items);
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
    return repairedInstances;
  }

  throw new Error(
    `Milestone validation failed after repair: ${repairErrors.map((e) => e.toString()).join(", ")}`,
  );
}

export function validateWeeklyPlan(raw: unknown): GeneratedWeeklyPlan {
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

export function validateWeeklyTasks(raw: unknown): GeneratedWeeklyTask[] {
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
