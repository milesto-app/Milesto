import "server-only";

import { apiFetch } from "@/lib/admin-api/client";
import type {
  AdminGoalCoachMemory,
  AdminGoalDebrief,
  AdminGoalDetail,
  AdminGoalEmbedding,
  AdminGoalIntakeBatch,
  AdminGoalList,
  AdminGoalRoadmap,
  AdminGoalWeeklyTask,
} from "@/lib/admin-api/types";

const DEFAULT_REVALIDATE_SECONDS = 30;
const GOALS_TAG = "admin:goals";

function goalTag(id: string) {
  return `admin:goal:${id}`;
}

function listNext() {
  return { tags: [GOALS_TAG], revalidate: DEFAULT_REVALIDATE_SECONDS };
}

function detailNext(id: string) {
  return {
    tags: [GOALS_TAG, goalTag(id)],
    revalidate: DEFAULT_REVALIDATE_SECONDS,
  };
}

export type ListGoalsParams = {
  page?: number;
  perPage?: number;
  status?: string;
  userId?: string;
};

export async function listGoals(
  params: ListGoalsParams = {},
): Promise<AdminGoalList> {
  return apiFetch<AdminGoalList>("/admin/goals", {
    next: listNext(),
    query: {
      page: params.page,
      perPage: params.perPage,
      status: params.status,
      userId: params.userId,
    },
  });
}

export async function getGoal(id: string): Promise<AdminGoalDetail> {
  return apiFetch<AdminGoalDetail>(`/admin/goals/${id}`, {
    next: detailNext(id),
  });
}

export async function getGoalIntake(
  id: string,
): Promise<AdminGoalIntakeBatch[]> {
  return apiFetch<AdminGoalIntakeBatch[]>(`/admin/goals/${id}/intake`, {
    next: detailNext(id),
  });
}

export async function getGoalRoadmap(id: string): Promise<AdminGoalRoadmap> {
  return apiFetch<AdminGoalRoadmap>(`/admin/goals/${id}/roadmap`, {
    next: detailNext(id),
  });
}

export async function getGoalWeeklyTasks(
  id: string,
  weekIndex?: number,
): Promise<AdminGoalWeeklyTask[]> {
  return apiFetch<AdminGoalWeeklyTask[]>(`/admin/goals/${id}/weekly-tasks`, {
    next: detailNext(id),
    query: { weekIndex },
  });
}

export async function getGoalDebriefs(id: string): Promise<AdminGoalDebrief[]> {
  return apiFetch<AdminGoalDebrief[]>(`/admin/goals/${id}/debriefs`, {
    next: detailNext(id),
  });
}

export async function getGoalCoachMemory(
  id: string,
): Promise<AdminGoalCoachMemory[]> {
  return apiFetch<AdminGoalCoachMemory[]>(`/admin/goals/${id}/coach-memory`, {
    next: detailNext(id),
  });
}

export async function getGoalEmbeddings(
  id: string,
  limit?: number,
): Promise<AdminGoalEmbedding[]> {
  return apiFetch<AdminGoalEmbedding[]>(`/admin/goals/${id}/embeddings`, {
    next: detailNext(id),
    query: { limit },
  });
}

export async function regenerateGoalProfile(id: string): Promise<unknown> {
  return apiFetch<unknown>(`/admin/goals/${id}/regenerate-profile`, {
    method: "POST",
    cache: "no-store",
  });
}

export async function regenerateGoalRoadmap(id: string): Promise<unknown> {
  return apiFetch<unknown>(`/admin/goals/${id}/regenerate-roadmap`, {
    method: "POST",
    cache: "no-store",
  });
}

export async function reembedGoal(id: string): Promise<unknown> {
  return apiFetch<unknown>(`/admin/goals/${id}/reembed`, {
    method: "POST",
    cache: "no-store",
  });
}

export async function deleteGoal(id: string): Promise<void> {
  await apiFetch<void>(`/admin/goals/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });
}

export const GOALS_CACHE_TAGS = {
  list: GOALS_TAG,
  detail: goalTag,
};
