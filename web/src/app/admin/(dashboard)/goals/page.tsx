import { listGoals } from "@/lib/admin-api/resources/goals";
import {
  readPage,
  readPerPage,
  readString,
} from "@/lib/admin-api/search-params";
import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";

import { GoalsTable } from "./_components/goals-table";

const GOAL_STATUS_OPTIONS = [
  { value: "intake_in_progress", label: "Intake in progress" },
  { value: "intake_completed", label: "Intake complete" },
  { value: "profile_generating", label: "Profile generating" },
  { value: "profile_generation_failed", label: "Profile failed" },
  { value: "roadmap_generating", label: "Roadmap generating" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = readPage(sp);
  const perPage = readPerPage(sp);
  const status = readString(sp, "status");
  const userId = readString(sp, "userId");

  const data = await listGoals({
    page,
    perPage,
    ...(status ? { status } : {}),
    ...(userId ? { userId } : {}),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Goals"
        description="Every non-deleted goal in the system."
      />
      <FilterBar
        searchPlaceholder="Filter by user UUID via the URL"
        facets={[
          {
            key: "status",
            label: "status",
            placeholder: "Status",
            options: GOAL_STATUS_OPTIONS,
          },
        ]}
      />
      <GoalsTable
        goals={data.goals}
        total={data.total}
        pageCount={Math.max(1, data.totalPages)}
      />
    </div>
  );
}
