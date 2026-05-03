"use client";

import type { ReactNode } from "react";

import { UrlTabs } from "@/components/admin/url-tabs";

export function SystemTabs({
  services,
  llm,
  logs,
}: {
  services: ReactNode;
  llm: ReactNode;
  logs: ReactNode;
}) {
  return (
    <UrlTabs
      defaultValue="services"
      items={[
        { value: "services", label: "Services", content: services },
        { value: "llm", label: "LLM", content: llm },
        { value: "logs", label: "Logs", content: logs },
      ]}
    />
  );
}
