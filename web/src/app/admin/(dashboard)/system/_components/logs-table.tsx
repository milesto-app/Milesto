"use client";

import { useState } from "react";

import type { AdminSystemLog } from "@/lib/admin-api/types";
import { defineColumns } from "@/components/admin/data-table/column-helpers";
import { DataTable } from "@/components/admin/data-table/data-table";
import { JsonViewer } from "@/components/admin/json-viewer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const DENSITY_KEY = "admin:logs:density";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function levelClass(level: string): string {
  switch (level) {
    case "error":
      return "text-destructive";
    case "warn":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-muted-foreground";
  }
}

const columns = defineColumns<AdminSystemLog>([
  {
    accessorKey: "level",
    header: "Level",
    cell: ({ row }) => (
      <span
        className={`font-mono text-[11px] uppercase tracking-wider ${levelClass(row.original.level)}`}
      >
        {row.original.level}
      </span>
    ),
  },
  {
    accessorKey: "context",
    header: "Context",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.context ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "message",
    header: "Message",
    cell: ({ row }) => (
      <span className="block max-w-[480px] truncate text-sm text-foreground">
        {row.original.message}
      </span>
    ),
  },
  {
    accessorKey: "loggedAt",
    header: "Time",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatDate(row.original.loggedAt)}
      </span>
    ),
  },
]);

export function LogsTable({ logs }: { logs: AdminSystemLog[] }) {
  const [active, setActive] = useState<AdminSystemLog | null>(null);
  return (
    <>
      <DataTable
        data={logs}
        columns={columns}
        total={logs.length}
        pageCount={1}
        densityKey={DENSITY_KEY}
        getRowId={(row) => row.id}
        onRowClick={(row) => setActive(row)}
        emptyState={{ title: "No logs in this window" }}
      />
      <Sheet open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Log entry</SheetTitle>
            <SheetDescription>
              {active ? formatDate(active.loggedAt) : ""}
            </SheetDescription>
          </SheetHeader>
          {active ? (
            <div className="space-y-3 px-4 pb-4 text-sm">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Level / context
                </p>
                <p
                  className={`font-mono text-xs uppercase ${levelClass(active.level)}`}
                >
                  {active.level} · {active.context ?? "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Message
                </p>
                <p className="whitespace-pre-wrap">{active.message}</p>
              </div>
              {active.stack ? (
                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Stack
                  </p>
                  <pre className="overflow-auto rounded-lg border border-border/60 bg-muted/30 p-3 font-mono text-[11px]">
                    {active.stack}
                  </pre>
                </div>
              ) : null}
              {active.metadata !== null && active.metadata !== undefined ? (
                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Metadata
                  </p>
                  <JsonViewer value={active.metadata} />
                </div>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
