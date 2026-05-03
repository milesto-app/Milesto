"use client";

import { useRouter } from "next/navigation";

import type { AdminCoachUserSummary } from "@/lib/admin-api/types";
import { defineColumns } from "@/components/admin/data-table/column-helpers";
import { DataTable } from "@/components/admin/data-table/data-table";
import {
  StatusBadge,
  type StatusVariant,
} from "@/components/admin/status-badge";

const DENSITY_KEY = "admin:coach-users:density";

function userLabel(row: AdminCoachUserSummary): string {
  const name = [row.firstName, row.lastName].filter(Boolean).join(" ");
  return name || row.email || row.id;
}

function statusVariant(status: string): StatusVariant {
  if (status === "active") return "active";
  if (status === "expired") return "expired";
  if (status === "cancelled") return "cancelled";
  if (status === "revoked") return "revoked";
  return "unknown";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const columns = defineColumns<AdminCoachUserSummary>([
  {
    accessorKey: "email",
    header: "User",
    cell: ({ row }) => (
      <span className="text-sm font-medium text-foreground">
        {userLabel(row.original)}
      </span>
    ),
  },
  {
    accessorKey: "subscriptionStatus",
    header: "Subscription",
    cell: ({ row }) => (
      <StatusBadge
        variant={statusVariant(row.original.subscriptionStatus)}
        label={row.original.subscriptionStatus}
      />
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground tabular-nums">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
]);

export function CoachUsersTable({
  users,
  total,
  pageCount,
}: {
  users: AdminCoachUserSummary[];
  total: number;
  pageCount: number;
}) {
  const router = useRouter();
  return (
    <DataTable
      data={users}
      columns={columns}
      total={total}
      pageCount={pageCount}
      densityKey={DENSITY_KEY}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
      emptyState={{ title: "No users assigned to this coach yet" }}
    />
  );
}
