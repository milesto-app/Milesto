"use client";

import type { ReactNode } from "react";

import { UrlTabs } from "@/components/admin/url-tabs";

export function IntakeTabs({
  batches,
  qualityFailures,
}: {
  batches: ReactNode;
  qualityFailures: ReactNode;
}) {
  return (
    <UrlTabs
      defaultValue="batches"
      items={[
        { value: "batches", label: "Batches", content: batches },
        {
          value: "quality-failures",
          label: "Quality Failures",
          content: qualityFailures,
        },
      ]}
    />
  );
}
