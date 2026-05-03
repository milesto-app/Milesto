"use client";

import { useState } from "react";

import { formatDateTime } from "@/lib/format";
import type { AdminNotificationSend } from "@/lib/admin-api/types";
import { defineColumns } from "@/components/admin/data-table/column-helpers";
import { DataTable } from "@/components/admin/data-table/data-table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const DENSITY_KEY = "admin:notification-sends:density";

const columns = defineColumns<AdminNotificationSend>([
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <span className="block max-w-[260px] truncate text-sm font-medium text-foreground">
        {row.original.title}
      </span>
    ),
  },
  {
    accessorKey: "body",
    header: "Body",
    cell: ({ row }) => (
      <span className="block max-w-[420px] truncate text-sm text-muted-foreground">
        {row.original.body}
      </span>
    ),
  },
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
    accessorKey: "sentAt",
    header: "Sent",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatDateTime(row.original.sentAt)}
      </span>
    ),
  },
]);

export function SendsTable({
  sends,
  total,
  pageCount,
}: {
  sends: AdminNotificationSend[];
  total: number;
  pageCount: number;
}) {
  const [active, setActive] = useState<AdminNotificationSend | null>(null);
  return (
    <>
      <DataTable
        data={sends}
        columns={columns}
        total={total}
        pageCount={pageCount}
        densityKey={DENSITY_KEY}
        getRowId={(row) => row.id}
        onRowClick={(row) => setActive(row)}
        emptyState={{ title: "No sends in this window" }}
      />
      <Sheet
        open={active !== null}
        onOpenChange={(open) => !open && setActive(null)}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Notification send</SheetTitle>
            <SheetDescription>
              {active ? formatDateTime(active.sentAt) : ""}
            </SheetDescription>
          </SheetHeader>
          {active ? (
            <div className="space-y-3 px-4 pb-4 text-sm">
              <Field label="Title" value={active.title} />
              <Field label="Body" value={active.body} />
              <Field label="User" value={active.userId} mono />
              <Field label="Notification ID" value={active.id} mono />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1 border-b border-border/40 pb-2 last:border-0">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`whitespace-pre-wrap text-foreground ${mono ? "font-mono text-xs" : "text-sm"}`}
      >
        {value}
      </p>
    </div>
  );
}
