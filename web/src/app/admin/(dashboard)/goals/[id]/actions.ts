"use server";

import { updateTag } from "next/cache";

import {
  GOALS_CACHE_TAGS,
  deleteGoal,
  reembedGoal,
  regenerateGoalProfile,
  regenerateGoalRoadmap,
} from "@/lib/admin-api/resources/goals";
import { normalizeError, type ActionResult } from "@/lib/admin-api/errors";

function revalidateGoal(id: string) {
  updateTag(GOALS_CACHE_TAGS.list);
  updateTag(GOALS_CACHE_TAGS.detail(id));
}

export async function regenerateProfileAction(
  id: string,
): Promise<ActionResult<unknown>> {
  try {
    const data = await regenerateGoalProfile(id);
    revalidateGoal(id);
    return { ok: true, data };
  } catch (error) {
    return normalizeError(error);
  }
}

export async function regenerateRoadmapAction(
  id: string,
): Promise<ActionResult<unknown>> {
  try {
    const data = await regenerateGoalRoadmap(id);
    revalidateGoal(id);
    return { ok: true, data };
  } catch (error) {
    return normalizeError(error);
  }
}

export async function reembedGoalAction(
  id: string,
): Promise<ActionResult<unknown>> {
  try {
    const data = await reembedGoal(id);
    revalidateGoal(id);
    return { ok: true, data };
  } catch (error) {
    return normalizeError(error);
  }
}

export async function deleteGoalAction(
  id: string,
): Promise<ActionResult<null>> {
  try {
    await deleteGoal(id);
    revalidateGoal(id);
    return { ok: true, data: null };
  } catch (error) {
    return normalizeError(error);
  }
}
