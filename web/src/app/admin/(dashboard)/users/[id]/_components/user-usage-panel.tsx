import { formatDate, formatNumber } from "@/lib/format";
import type { AdminUserUsage } from "@/lib/admin-api/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function prettyType(type: string): string {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function UserUsagePanel({ usage }: { usage: AdminUserUsage }) {
  const byTypeEntries = Object.entries(usage.byType).sort(
    ([, a], [, b]) => b - a,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/50 bg-card p-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Total generations
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {formatNumber(usage.totalGenerations)}
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">By type</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {byTypeEntries.length === 0 ? (
            <p className="col-span-full text-sm text-muted-foreground">
              No generations recorded
            </p>
          ) : (
            byTypeEntries.map(([type, count]) => (
              <div
                key={type}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-card px-3 py-2"
              >
                <span className="text-sm">{prettyType(type)}</span>
                <span className="text-sm font-medium tabular-nums">
                  {formatNumber(count)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">Recent</h3>
        <div className="mt-3 overflow-hidden rounded-xl border border-border/50 bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usage.recent.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No recent activity
                  </TableCell>
                </TableRow>
              ) : (
                usage.recent.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">
                      {prettyType(entry.generationType)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {formatDate(entry.usageDate)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {formatDate(entry.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
