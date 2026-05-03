import "server-only";

import { apiFetch } from "@/lib/admin-api/client";
import type { AdminSubscriptionDistribution } from "@/lib/admin-api/types";

const DEFAULT_REVALIDATE_SECONDS = 30;
const SUBSCRIPTIONS_TAG = "admin:subscriptions";

export async function getSubscriptionDistribution(): Promise<AdminSubscriptionDistribution> {
  return apiFetch<AdminSubscriptionDistribution>(
    "/admin/subscriptions/distribution",
    {
      next: {
        tags: [SUBSCRIPTIONS_TAG],
        revalidate: DEFAULT_REVALIDATE_SECONDS,
      },
    },
  );
}
