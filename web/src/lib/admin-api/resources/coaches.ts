import "server-only";

import { apiFetch } from "@/lib/admin-api/client";
import type {
  AdminCoachSummary,
  AdminCoachUserList,
} from "@/lib/admin-api/types";

const DEFAULT_REVALIDATE_SECONDS = 30;
const COACHES_TAG = "admin:coaches";

function coachTag(id: number) {
  return `admin:coach:${id}`;
}

export async function listCoaches(): Promise<AdminCoachSummary[]> {
  return apiFetch<AdminCoachSummary[]>("/admin/coaches", {
    next: { tags: [COACHES_TAG], revalidate: DEFAULT_REVALIDATE_SECONDS },
  });
}

export type ListCoachUsersParams = {
  page?: number;
  perPage?: number;
};

export async function listCoachUsers(
  id: number,
  params: ListCoachUsersParams = {},
): Promise<AdminCoachUserList> {
  return apiFetch<AdminCoachUserList>(`/admin/coaches/${id}/users`, {
    next: {
      tags: [COACHES_TAG, coachTag(id)],
      revalidate: DEFAULT_REVALIDATE_SECONDS,
    },
    query: {
      page: params.page,
      perPage: params.perPage,
    },
  });
}
