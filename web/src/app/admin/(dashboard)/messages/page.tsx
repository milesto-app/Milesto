import { getMessageStats } from "@/lib/admin-api/resources/conversations";
import type { AdminMessageStats } from "@/lib/admin-api/types";
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
import { PageHeader } from "@/components/admin/page-header";

export default async function MessagesPage() {
  const stats = await getMessageStats();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Messages"
        description="Coach messaging volume and tool usage over the last 30 days."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total" value={stats.totals.total.toLocaleString()} />
        <KpiCard
          label="From users"
          value={stats.totals.byRole.user.toLocaleString()}
        />
        <KpiCard
          label="From assistant"
          value={stats.totals.byRole.assistant.toLocaleString()}
        />
        <KpiCard
          label="Tool messages"
          value={stats.totals.byRole.tool.toLocaleString()}
        />
      </div>
      <DailyTable stats={stats} />
      <ToolBreakdown stats={stats} />
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border/60 shadow-none">
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

function DailyTable({ stats }: { stats: AdminMessageStats }) {
  if (stats.days.length === 0) {
    return <EmptyState title="No messages in this window" />;
  }
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Daily volume
      </p>
      <Card className="border-border/60 shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">User</TableHead>
              <TableHead className="text-right">Assistant</TableHead>
              <TableHead className="text-right">Tool</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.days.map((day) => (
              <TableRow key={day.date}>
                <TableCell className="font-mono text-xs tabular-nums">
                  {day.date}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {day.total.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {day.byRole.user.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {day.byRole.assistant.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {day.byRole.tool.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ToolBreakdown({ stats }: { stats: AdminMessageStats }) {
  const entries = Object.entries(stats.toolBreakdown).sort(
    (a, b) => b[1] - a[1],
  );
  if (entries.length === 0) {
    return null;
  }
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Tool breakdown
      </p>
      <Card className="border-border/60 shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tool</TableHead>
              <TableHead className="text-right">Calls</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(([tool, count]) => (
              <TableRow key={tool}>
                <TableCell className="font-mono text-xs">{tool}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {count.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
