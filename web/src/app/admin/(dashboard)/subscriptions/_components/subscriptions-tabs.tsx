"use client";

import type { ReactNode } from "react";

import { UrlTabs } from "@/components/admin/url-tabs";

export function SubscriptionsTabs({
  subscribers,
  mrrArr,
  churn,
  events,
  distribution,
}: {
  subscribers: ReactNode;
  mrrArr: ReactNode;
  churn: ReactNode;
  events: ReactNode;
  distribution: ReactNode;
}) {
  return (
    <UrlTabs
      defaultValue="subscribers"
      items={[
        { value: "subscribers", label: "Subscribers", content: subscribers },
        { value: "mrr-arr", label: "MRR / ARR", content: mrrArr },
        { value: "churn", label: "Churn", content: churn },
        { value: "events", label: "Recent Events", content: events },
        { value: "distribution", label: "Distribution", content: distribution },
      ]}
    />
  );
}
