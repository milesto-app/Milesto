"use client";

import type { AdminNotificationDevice } from "@/lib/admin-api/types";
import { defineColumns } from "@/components/admin/data-table/column-helpers";
import { DataTable } from "@/components/admin/data-table/data-table";

const DENSITY_KEY = "admin:notification-devices:density";

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

const columns = defineColumns<AdminNotificationDevice>([
  {
    accessorKey: "userId",
    header: "User",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.userId.slice(0, 8)}
      </span>
    ),
  },
  {
    accessorKey: "platform",
    header: "Platform",
    cell: ({ row }) => (
      <span className="text-sm capitalize">{row.original.platform}</span>
    ),
  },
  {
    accessorKey: "environment",
    header: "Env",
    cell: ({ row }) => (
      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {row.original.environment}
      </span>
    ),
  },
  {
    accessorKey: "tokenLast4",
    header: "Token",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        ****{row.original.tokenLast4}
      </span>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: "Last seen",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatDate(row.original.updatedAt)}
      </span>
    ),
  },
]);

export function DevicesTable({
  devices,
  total,
  pageCount,
}: {
  devices: AdminNotificationDevice[];
  total: number;
  pageCount: number;
}) {
  return (
    <DataTable
      data={devices}
      columns={columns}
      total={total}
      pageCount={pageCount}
      densityKey={DENSITY_KEY}
      getRowId={(row) => row.id}
      emptyState={{ title: "No devices registered yet" }}
    />
  );
}
