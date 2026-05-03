import "server-only";

import { apiFetch } from "@/lib/admin-api/client";
import type {
  AdminUserDetail,
  AdminUserGoal,
  AdminUserList,
} from "@/lib/admin-api/types";

const DEFAULT_REVALIDATE_SECONDS = 30;
const USERS_TAG = "admin:users";

function userTag(id: string) {
  return `admin:user:${id}`;
}

export type ListUsersParams = {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
};

export async function listUsers(
  params: ListUsersParams = {},
): Promise<AdminUserList> {
  return apiFetch<AdminUserList>("/admin/users", {
    next: {
      tags: [USERS_TAG],
      revalidate: DEFAULT_REVALIDATE_SECONDS,
    },
    query: {
      page: params.page,
      perPage: params.perPage,
      search: params.search,
      status: params.status,
    },
  });
}

export async function getUser(id: string): Promise<AdminUserDetail> {
  return apiFetch<AdminUserDetail>(`/admin/users/${id}`, {
    next: {
      tags: [USERS_TAG, userTag(id)],
      revalidate: DEFAULT_REVALIDATE_SECONDS,
    },
  });
}

export async function getUserGoals(id: string): Promise<AdminUserGoal[]> {
  return apiFetch<AdminUserGoal[]>(`/admin/users/${id}/goals`, {
    next: {
      tags: [USERS_TAG, userTag(id)],
      revalidate: DEFAULT_REVALIDATE_SECONDS,
    },
  });
}
