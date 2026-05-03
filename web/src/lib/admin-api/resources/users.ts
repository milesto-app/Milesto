import "server-only";

import { apiFetch } from "@/lib/admin-api/client";
import type {
  AdminUserDetail,
  AdminUserDevice,
  AdminUserGoal,
  AdminUserList,
  AdminUserSubscription,
  AdminUserUsage,
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

export async function getUserUsage(id: string): Promise<AdminUserUsage> {
  return apiFetch<AdminUserUsage>(`/admin/users/${id}/usage`, {
    next: {
      tags: [USERS_TAG, userTag(id)],
      revalidate: DEFAULT_REVALIDATE_SECONDS,
    },
  });
}

export async function getUserSubscription(
  id: string,
): Promise<AdminUserSubscription> {
  return apiFetch<AdminUserSubscription>(`/admin/users/${id}/subscription`, {
    next: {
      tags: [USERS_TAG, userTag(id)],
      revalidate: DEFAULT_REVALIDATE_SECONDS,
    },
  });
}

export async function getUserDevices(id: string): Promise<AdminUserDevice[]> {
  return apiFetch<AdminUserDevice[]>(`/admin/users/${id}/devices`, {
    next: {
      tags: [USERS_TAG, userTag(id)],
      revalidate: DEFAULT_REVALIDATE_SECONDS,
    },
  });
}

export type UpdateUserBody = {
  role?: "user" | "admin";
  language?: string;
  coachId?: number;
};

export async function updateUser(
  id: string,
  body: UpdateUserBody,
): Promise<AdminUserDetail> {
  return apiFetch<AdminUserDetail>(`/admin/users/${id}`, {
    method: "PATCH",
    cache: "no-store",
    body,
  });
}

export async function grantPro(
  id: string,
  expiresAt: string,
): Promise<AdminUserSubscription> {
  return apiFetch<AdminUserSubscription>(`/admin/users/${id}/grant-pro`, {
    method: "POST",
    cache: "no-store",
    body: { expiresAt },
  });
}

export async function revokePro(id: string): Promise<AdminUserSubscription> {
  return apiFetch<AdminUserSubscription>(`/admin/users/${id}/revoke-pro`, {
    method: "POST",
    cache: "no-store",
  });
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetch<void>(`/admin/users/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });
}

export const USERS_CACHE_TAGS = {
  list: USERS_TAG,
  detail: userTag,
};
