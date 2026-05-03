import "server-only";

import { apiFetch } from "@/lib/admin-api/client";
import type {
  AdminIntakeBatchList,
  AdminIntakeQualityFailures,
} from "@/lib/admin-api/types";

const DEFAULT_REVALIDATE_SECONDS = 30;
const INTAKE_TAG = "admin:intake";

function next() {
  return { tags: [INTAKE_TAG], revalidate: DEFAULT_REVALIDATE_SECONDS };
}

export type ListBatchesParams = {
  page?: number;
  perPage?: number;
  goalId?: string;
};

export async function listIntakeBatches(
  params: ListBatchesParams = {},
): Promise<AdminIntakeBatchList> {
  return apiFetch<AdminIntakeBatchList>("/admin/intake/batches", {
    next: next(),
    query: {
      page: params.page,
      perPage: params.perPage,
      goalId: params.goalId,
    },
  });
}

export async function getIntakeQualityFailures(
  days?: number,
): Promise<AdminIntakeQualityFailures> {
  return apiFetch<AdminIntakeQualityFailures>(
    "/admin/intake/quality-failures",
    {
      next: next(),
      query: { days },
    },
  );
}
