"use client";

import { useState } from "react";

import type { AdminSubscriptionSummary } from "@/lib/admin-api/types";
import { defineColumns } from "@/components/admin/data-table/column-helpers";
import { DataTable } from "@/components/admin/data-table/data-table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  StatusBadge,
  type StatusVariant,
} from "@/components/admin/status-badge";

const DENSITY_KEY = "admin:subscriptions:density";

function statusVariant(status: string): StatusVariant {
  if (status === "active") return "active";
  if (status === "expired") return "expired";
  if (status === "cancelled") return "cancelled";
  if (status === "revoked") return "revoked";
  if (status === "pending") return "pending";
  return "unknown";
}

function userLabel(row: AdminSubscriptionSummary): string {
  const name = [row.firstName, row.lastName].filter(Boolean).join(" ");
  return name || row.email || row.userId;
}

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

const columns = defineColumns<AdminSubscriptionSummary>([
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        variant={statusVariant(row.original.status)}
        label={row.original.status}
      />
    ),
  },
  {
    accessorKey: "productId",
    header: "Product",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.productId ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "expiresAt",
    header: "Expires",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground tabular-nums">
        {formatDate(row.original.expiresAt)}
      </span>
    ),
  },
  {
    accessorKey: "verifiedAt",
    header: "Verified",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground tabular-nums">
        {formatDate(row.original.verifiedAt)}
      </span>
    ),
  },
]);

export function SubscriptionsTable({
  subscriptions,
  total,
  pageCount,
}: {
  subscriptions: AdminSubscriptionSummary[];
  total: number;
  pageCount: number;
}) {
  const [active, setActive] = useState<AdminSubscriptionSummary | null>(null);
  return (
    <>
      <DataTable
        data={subscriptions}
        columns={columns}
        total={total}
        pageCount={pageCount}
        densityKey={DENSITY_KEY}
        getRowId={(row) => row.userId}
        onRowClick={(row) => setActive(row)}
        emptyState={{
          title: "No subscriptions in this window",
          description: "Adjust the filters to widen the search.",
        }}
      />
      <Sheet
        open={active !== null}
        onOpenChange={(open) => !open && setActive(null)}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Subscription detail</SheetTitle>
            <SheetDescription>
              {active ? userLabel(active) : ""}
            </SheetDescription>
          </SheetHeader>
          {active ? <SubscriptionDetail row={active} /> : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function SubscriptionDetail({ row }: { row: AdminSubscriptionSummary }) {
  return (
    <dl className="space-y-3 px-4 pb-4 text-sm">
      <Detail label="User ID" value={row.userId} mono />
      <Detail label="Email" value={row.email} />
      <Detail label="Status" value={row.status} />
      <Detail label="Product" value={row.productId ?? "—"} />
      <Detail label="Source" value={row.source} />
      <Detail label="Environment" value={row.environment ?? "—"} />
      <Detail
        label="Auto-renew"
        value={
          row.autoRenewStatus === null
            ? "—"
            : row.autoRenewStatus
              ? "On"
              : "Off"
        }
      />
      <Detail label="Expires" value={formatDate(row.expiresAt)} />
      <Detail label="Verified" value={formatDate(row.verifiedAt)} />
      <Detail label="Last synced" value={formatDate(row.lastSyncedAt)} />
      <Detail label="Apple signed" value={formatDate(row.appleSignedAt)} />
      <Detail
        label="Original txn"
        value={row.originalTransactionId ?? "—"}
        mono
      />
    </dl>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-2 last:border-0">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`text-right text-foreground ${mono ? "font-mono text-[11px]" : "text-sm"}`}
      >
        {value}
      </dd>
    </div>
  );
}
