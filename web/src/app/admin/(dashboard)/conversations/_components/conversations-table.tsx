"use client";

import { useRouter } from "next/navigation";

import type { AdminConversationSummary } from "@/lib/admin-api/types";
import { defineColumns } from "@/components/admin/data-table/column-helpers";
import { DataTable } from "@/components/admin/data-table/data-table";

const DENSITY_KEY = "admin:conversations:density";

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

function userLabel(row: AdminConversationSummary): string {
  const name = [row.userFirstName, row.userLastName].filter(Boolean).join(" ");
  return name || row.userEmail || row.userId;
}

const columns = defineColumns<AdminConversationSummary>([
  {
    accessorKey: "goalTitle",
    header: "Goal",
    cell: ({ row }) => (
      <span className="block max-w-[280px] truncate text-sm font-medium text-foreground">
        {row.original.goalTitle ?? row.original.goalId}
      </span>
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
    accessorKey: "messageCount",
    header: "Messages",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground tabular-nums">
        {row.original.messageCount}
      </span>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground tabular-nums">
        {formatDate(row.original.updatedAt)}
      </span>
    ),
  },
]);

export function ConversationsTable({
  conversations,
  total,
  pageCount,
}: {
  conversations: AdminConversationSummary[];
  total: number;
  pageCount: number;
}) {
  const router = useRouter();
  return (
    <DataTable
      data={conversations}
      columns={columns}
      total={total}
      pageCount={pageCount}
      densityKey={DENSITY_KEY}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`/admin/conversations/${row.id}`)}
      emptyState={{
        title: "No conversations in this window",
        description: "Try clearing filters or waiting for new activity.",
      }}
    />
  );
}
