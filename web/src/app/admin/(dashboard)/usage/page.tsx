import Link from "next/link";

import {
  getDailyUsage,
  getTopUsers,
  getUsageByType,
  getUsageTotals,
} from "@/lib/admin-api/resources/usage";
import { readString } from "@/lib/admin-api/search-params";
import type {
  AdminUsageByTypeEntry,
  AdminUsageDaily,
  AdminUsageTopUser,
  AdminUsageTotals,
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
import { DateRangePicker, dateRangeToDays, readDateRange } from "@/components/admin/date-range-picker";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";

import { UsageTabs } from "./_components/usage-tabs";

const NUMBER = new Intl.NumberFormat("en-US");

function formatType(type: string): string {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const range = readDateRange(sp);
  const days = dateRangeToDays(range);
  const type = readString(sp, "type");

  const [daily, totals, byType, topUsers] = await Promise.all([
    getDailyUsage(days, type),
    getUsageTotals(days),
    getUsageByType(days),
    getTopUsers(20, days),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Usage"
        description="AI generation activity in the selected window."
        actions={<DateRangePicker />}
      />
      <UsageTabs
        daily={<DailyPanel data={daily} />}
        totals={<TotalsPanel data={totals} />}
        byType={<ByTypePanel data={byType} />}
        topUsers={<TopUsersPanel data={topUsers} />}
        cost={<CostPanel />}
      />
    </div>
  );
}

function DailyPanel({ data }: { data: AdminUsageDaily }) {
  if (data.days.length === 0) {
    return <EmptyState title="No usage in this window" />;
  }
  const allKeys = new Set<string>();
  for (const day of data.days) {
    for (const key of Object.keys(day.counts)) allKeys.add(key);
  }
  const types = Array.from(allKeys).sort();
  return (
    <Card className="border-border/60 shadow-none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            {types.map((type) => (
              <TableHead key={type} className="text-right">
                {formatType(type)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.days.map((day) => (
            <TableRow key={day.date}>
              <TableCell className="font-mono text-xs tabular-nums">
                {day.date}
              </TableCell>
              {types.map((type) => (
                <TableCell key={type} className="text-right tabular-nums">
                  {NUMBER.format(day.counts[type] ?? 0)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function TotalsPanel({ data }: { data: AdminUsageTotals }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return <EmptyState title="No totals in this window" />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([type, count]) => (
        <Card key={type} className="border-border/60 shadow-none">
          <CardContent className="space-y-1 p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {formatType(type)}
            </p>
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {NUMBER.format(count)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ByTypePanel({ data }: { data: AdminUsageByTypeEntry[] }) {
  if (data.length === 0) {
    return <EmptyState title="No usage in this window" />;
  }
  const sorted = [...data].sort((a, b) => b.count - a.count);
  return (
    <Card className="border-border/60 shadow-none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Count</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((entry) => (
            <TableRow key={entry.type}>
              <TableCell>{formatType(entry.type)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {NUMBER.format(entry.count)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function TopUsersPanel({ data }: { data: AdminUsageTopUser[] }) {
  if (data.length === 0) {
    return <EmptyState title="No users in this window" />;
  }
  return (
    <Card className="border-border/60 shadow-none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead className="text-right">Generations</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((user) => (
            <TableRow key={user.userId}>
              <TableCell>
                <Link
                  href={`/admin/users/${user.userId}`}
                  className="text-sm text-primary hover:underline"
                >
                  {user.name}
                </Link>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {NUMBER.format(user.count)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function CostPanel() {
  return (
    <EmptyState
      title="Cost analysis coming soon"
      description="Cost breakdowns ship in a future phase."
    />
  );
}
