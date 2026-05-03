"use client";

import type { ReactNode } from "react";

import { UrlTabs } from "@/components/admin/url-tabs";

export function UserTabs({
  overview,
  goals,
  usage,
  subscription,
  devices,
}: {
  overview: ReactNode;
  goals: ReactNode;
  usage: ReactNode;
  subscription: ReactNode;
  devices: ReactNode;
}) {
  return (
    <UrlTabs
      defaultValue="overview"
      items={[
        { value: "overview", label: "Overview", content: overview },
        { value: "goals", label: "Goals", content: goals },
        { value: "usage", label: "Usage", content: usage },
        { value: "subscription", label: "Subscription", content: subscription },
        { value: "devices", label: "Devices", content: devices },
      ]}
    />
  );
}
