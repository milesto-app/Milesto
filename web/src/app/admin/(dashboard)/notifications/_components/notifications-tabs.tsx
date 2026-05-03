"use client";

import type { ReactNode } from "react";

import { UrlTabs } from "@/components/admin/url-tabs";

export function NotificationsTabs({
  sends,
  devices,
  scheduler,
}: {
  sends: ReactNode;
  devices: ReactNode;
  scheduler: ReactNode;
}) {
  return (
    <UrlTabs
      defaultValue="sends"
      items={[
        { value: "sends", label: "Sends", content: sends },
        { value: "devices", label: "Devices", content: devices },
        { value: "scheduler", label: "Scheduler", content: scheduler },
      ]}
    />
  );
}
