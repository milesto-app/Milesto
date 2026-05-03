import "server-only";

import { apiFetch } from "@/lib/admin-api/client";
import type {
  AdminListResponse,
  AdminMe,
  AdminRoleUpdate,
} from "@/lib/admin-api/types";

const DEFAULT_REVALIDATE_SECONDS = 30;
const ME_TAG = "admin:me";
const ADMINS_TAG = "admin:admins";

export async function getMe(): Promise<AdminMe> {
  return apiFetch<AdminMe>("/admin/me", {
    next: { tags: [ME_TAG], revalidate: DEFAULT_REVALIDATE_SECONDS },
  });
}

export async function listAdmins(): Promise<AdminListResponse> {
  return apiFetch<AdminListResponse>("/admin/admins", {
    next: { tags: [ADMINS_TAG], revalidate: DEFAULT_REVALIDATE_SECONDS },
  });
}

export async function promoteAdmin(userId: string): Promise<AdminRoleUpdate> {
  return apiFetch<AdminRoleUpdate>(`/admin/admins/${userId}`, {
    method: "POST",
    cache: "no-store",
  });
}

export async function demoteAdmin(userId: string): Promise<void> {
  await apiFetch<void>(`/admin/admins/${userId}`, {
    method: "DELETE",
    cache: "no-store",
  });
}

export const META_CACHE_TAGS = {
  me: ME_TAG,
  admins: ADMINS_TAG,
};
