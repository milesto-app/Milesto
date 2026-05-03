import "server-only";

import { apiFetch } from "@/lib/admin-api/client";
import type {
  AdminSubscriptionChurn,
  AdminSubscriptionDistribution,
  AdminSubscriptionEventList,
  AdminSubscriptionList,
  AdminSubscriptionMrrArr,
} from "@/lib/admin-api/types";

const DEFAULT_REVALIDATE_SECONDS = 30;
const SUBSCRIPTIONS_TAG = "admin:subscriptions";

function next() {
  return { tags: [SUBSCRIPTIONS_TAG], revalidate: DEFAULT_REVALIDATE_SECONDS };
}

export type ListSubscriptionsParams = {
  page?: number;
  perPage?: number;
  status?: string;
};

export async function listSubscriptions(
  params: ListSubscriptionsParams = {},
): Promise<AdminSubscriptionList> {
  return apiFetch<AdminSubscriptionList>("/admin/subscriptions", {
    next: next(),
    query: {
      page: params.page,
      perPage: params.perPage,
      status: params.status,
    },
  });
}

export async function getSubscriptionDistribution(): Promise<AdminSubscriptionDistribution> {
  return apiFetch<AdminSubscriptionDistribution>(
    "/admin/subscriptions/distribution",
    {
      next: next(),
    },
  );
}

export async function getMrrArr(): Promise<AdminSubscriptionMrrArr> {
  return apiFetch<AdminSubscriptionMrrArr>("/admin/subscriptions/mrr-arr", {
    next: next(),
  });
}

export async function getChurn(days?: number): Promise<AdminSubscriptionChurn> {
  return apiFetch<AdminSubscriptionChurn>("/admin/subscriptions/churn", {
    next: next(),
    query: { days },
  });
}

export async function getRecentEvents(
  limit?: number,
): Promise<AdminSubscriptionEventList> {
  return apiFetch<AdminSubscriptionEventList>(
    "/admin/subscriptions/recent-events",
    {
      next: next(),
      query: { limit },
    },
  );
}
