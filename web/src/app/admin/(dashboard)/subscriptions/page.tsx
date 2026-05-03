import {
  getChurn,
  getMrrArr,
  getRecentEvents,
  getSubscriptionDistribution,
  listSubscriptions,
} from "@/lib/admin-api/resources/subscriptions";
import {
  readPage,
  readPerPage,
  readString,
} from "@/lib/admin-api/search-params";
import type {
  AdminSubscriptionChurn,
  AdminSubscriptionEventList,
  AdminSubscriptionMrrArr,
} from "@/lib/admin-api/types";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/admin/empty-state";
import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";

import { SubscriptionsTable } from "./_components/subscriptions-table";
import { SubscriptionsTabs } from "./_components/subscriptions-tabs";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
  { value: "revoked", label: "Revoked" },
  { value: "pending", label: "Pending" },
];

const CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const PERCENT = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

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

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = readPage(sp);
  const perPage = readPerPage(sp);
  const status = readString(sp, "status");

  const [list, mrrArr, churn, events, distribution] = await Promise.all([
    listSubscriptions({ page, perPage, ...(status ? { status } : {}) }),
    getMrrArr(),
    getChurn(),
    getRecentEvents(),
    getSubscriptionDistribution(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Subscriptions"
        description="Pro tier health, MRR, churn, and recent App Store events."
      />
      <SubscriptionsTabs
        subscribers={
          <div className="space-y-3">
            <FilterBar
              searchPlaceholder="Filter by user UUID via the URL"
              facets={[
                {
                  key: "status",
                  label: "status",
                  placeholder: "Status",
                  options: STATUS_OPTIONS,
                },
              ]}
            />
            <SubscriptionsTable
              subscriptions={list.subscriptions}
              total={list.total}
              pageCount={Math.max(1, list.totalPages)}
            />
          </div>
        }
        mrrArr={<MrrArrPanel data={mrrArr} />}
        churn={<ChurnPanel data={churn} />}
        events={<EventsPanel data={events} />}
        distribution={<DistributionPanel data={distribution} />}
      />
    </div>
  );
}

function MrrArrPanel({ data }: { data: AdminSubscriptionMrrArr }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard label="MRR" value={CURRENCY.format(data.mrr)} />
        <KpiCard label="ARR" value={CURRENCY.format(data.arr)} />
      </div>
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          By product
        </p>
        <Card className="border-border/60 shadow-none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead className="text-right">ARR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(data.byProduct).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No product breakdown available.
                  </TableCell>
                </TableRow>
              ) : (
                Object.entries(data.byProduct).map(([product, breakdown]) => (
                  <TableRow key={product}>
                    <TableCell className="font-mono text-xs">
                      {product}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {breakdown.count}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {CURRENCY.format(breakdown.mrr)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {CURRENCY.format(breakdown.arr)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

function ChurnPanel({ data }: { data: AdminSubscriptionChurn }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <KpiCard label="Window (days)" value={String(data.windowDays)} />
      <KpiCard label="Churned" value={data.churned.toLocaleString()} />
      <KpiCard label="Retained" value={data.retained.toLocaleString()} />
      <KpiCard
        label="Churn rate"
        value={PERCENT.format(data.churnRate)}
        className="sm:col-span-3"
      />
    </div>
  );
}

function EventsPanel({ data }: { data: AdminSubscriptionEventList }) {
  if (data.events.length === 0) {
    return <EmptyState title="No events in this window" />;
  }
  return (
    <Card className="border-border/60 shadow-none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Subtype</TableHead>
            <TableHead>Notification</TableHead>
            <TableHead className="text-right">Received</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.events.map((event) => (
            <TableRow key={event.notificationUuid}>
              <TableCell className="font-medium">
                {event.notificationType}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {event.subtype ?? "—"}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {event.notificationUuid}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {formatDate(event.receivedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function DistributionPanel({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <EmptyState title="No distribution data yet" />;
  }
  return (
    <Card className="border-border/60 shadow-none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Count</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(([status, count]) => (
            <TableRow key={status}>
              <TableCell className="capitalize">{status}</TableCell>
              <TableCell className="text-right tabular-nums">
                {count.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function KpiCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <Card className={`border-border/60 shadow-none ${className ?? ""}`}>
      <CardContent className="space-y-1 p-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
