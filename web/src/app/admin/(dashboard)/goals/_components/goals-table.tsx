"use client";

import { useRouter } from "next/navigation";

import type { AdminGoalSummary } from "@/lib/admin-api/types";
import { DataTable } from "@/components/admin/data-table/data-table";
import { defineColumns } from "@/components/admin/data-table/column-helpers";
import {
  StatusBadge,
  type StatusVariant,
} from "@/components/admin/status-badge";

const DENSITY_KEY = "admin:goals:density";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusVariant(status: string): StatusVariant {
  if (status === "active") return "active";
  if (status === "completed") return "active";
  if (status === "profile_generation_failed") return "down";
  if (status === "intake_in_progress") return "pending";
  return "unknown";
}

function userLabel(row: AdminGoalSummary): string {
  const name = [row.userFirstName, row.userLastName].filter(Boolean).join(" ");
  return name || row.userEmail || row.userId;
}

const columns = defineColumns<AdminGoalSummary>([
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <span className="block max-w-[320px] truncate text-sm font-medium text-foreground">
        {row.original.title}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        variant={statusVariant(row.original.status)}
        label={row.original.status.replace(/_/g, " ")}
      />
    ),
  },
  {
    accessorKey: "userEmail",
    header: "User",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {userLabel(row.original)}
      </span>
    ),
  },
  {
    accessorKey: "targetDate",
    header: "Target",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground tabular-nums">
        {formatDate(row.original.targetDate)}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground tabular-nums">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
]);

export function GoalsTable({
  goals,
  total,
  pageCount,
}: {
  goals: AdminGoalSummary[];
  total: number;
  pageCount: number;
}) {
  const router = useRouter();
  return (
    <DataTable
      data={goals}
      columns={columns}
      total={total}
      pageCount={pageCount}
      densityKey={DENSITY_KEY}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`/admin/goals/${row.id}`)}
      emptyState={{
        title: "No goals in this window",
        description: "Try clearing the filters or widening the search.",
      }}
    />
  );
}
