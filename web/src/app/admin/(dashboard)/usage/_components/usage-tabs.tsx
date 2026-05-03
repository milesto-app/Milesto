"use client";

import type { ReactNode } from "react";

import { UrlTabs } from "@/components/admin/url-tabs";

export function UsageTabs({
  daily,
  totals,
  byType,
  topUsers,
  cost,
}: {
  daily: ReactNode;
  totals: ReactNode;
  byType: ReactNode;
  topUsers: ReactNode;
  cost: ReactNode;
}) {
  return (
    <UrlTabs
      defaultValue="daily"
      items={[
        { value: "daily", label: "Daily", content: daily },
        { value: "totals", label: "Totals", content: totals },
        { value: "by-type", label: "By Type", content: byType },
        { value: "top-users", label: "Top Users", content: topUsers },
        { value: "cost", label: "Cost", content: cost },
      ]}
    />
  );
}
