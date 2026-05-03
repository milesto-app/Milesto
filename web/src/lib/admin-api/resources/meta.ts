import "server-only";

import { apiFetch } from "@/lib/admin-api/client";
import type {
  AdminListResponse,
  AdminMe,
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
