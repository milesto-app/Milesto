"use client";

import Link from "next/link";

import type { AdminIntakeBatch } from "@/lib/admin-api/types";
import { defineColumns } from "@/components/admin/data-table/column-helpers";
import { DataTable } from "@/components/admin/data-table/data-table";
import { StatusBadge } from "@/components/admin/status-badge";

const DENSITY_KEY = "admin:intake:density";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const columns = defineColumns<AdminIntakeBatch>([
  {
    accessorKey: "goalId",
    header: "Goal",
    cell: ({ row }) => (
      <Link
        href={`/admin/goals/${row.original.goalId}`}
        className="font-mono text-xs text-primary hover:underline"
      >
        {row.original.goalId.slice(0, 8)}
      </Link>
    ),
  },
  {
    accessorKey: "batchNumber",
    header: "Batch",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">#{row.original.batchNumber}</span>
    ),
  },
  {
    accessorKey: "isAnswered",
    header: "Answered",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground tabular-nums">
        {row.original.answeredCount}/{row.original.questionCount}
      </span>
    ),
  },
  {
    accessorKey: "embedded",
    header: "Embedded",
    cell: ({ row }) => (
      <StatusBadge
        variant={row.original.embedded ? "active" : "pending"}
        label={row.original.embedded ? "Yes" : "No"}
      />
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

export function IntakeBatchesTable({
  batches,
  total,
  pageCount,
}: {
  batches: AdminIntakeBatch[];
  total: number;
  pageCount: number;
}) {
  return (
    <DataTable
      data={batches}
      columns={columns}
      total={total}
      pageCount={pageCount}
      densityKey={DENSITY_KEY}
      getRowId={(row) => row.id}
      emptyState={{ title: "No intake batches in this window" }}
    />
  );
}
