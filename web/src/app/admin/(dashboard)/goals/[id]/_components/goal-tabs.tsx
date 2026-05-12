"use client";

import type { ReactNode } from "react";

import { UrlTabs } from "@/components/admin/url-tabs";

export function GoalTabs({
  overview,
  intake,
  roadmap,
  weeklyTasks,
  debriefs,
  coachMemory,
}: {
  overview: ReactNode;
  intake: ReactNode;
  roadmap: ReactNode;
  weeklyTasks: ReactNode;
  debriefs: ReactNode;
  coachMemory: ReactNode;
}) {
  return (
    <UrlTabs
      defaultValue="overview"
      items={[
        { value: "overview", label: "Overview", content: overview },
        { value: "intake", label: "Intake", content: intake },
        { value: "roadmap", label: "Roadmap", content: roadmap },
        { value: "weekly-tasks", label: "Weekly Tasks", content: weeklyTasks },
        { value: "debriefs", label: "Debriefs", content: debriefs },
        { value: "coach-memory", label: "Coach Memory", content: coachMemory },
      ]}
    />
  );
}
