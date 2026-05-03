import {
  getDailyUsage,
  getTopUsers,
  getUsageByType,
} from "@/lib/admin-api/resources/usage";
import { getSubscriptionDistribution } from "@/lib/admin-api/resources/subscriptions";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatsCard } from "@/components/admin/stats-card";
import { UsageChart } from "@/components/admin/usage-chart";

function formatTypeLabel(type: string): string {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function UsagePage() {
  const [daily, byType, subscriptions, topUsers] = await Promise.all([
    getDailyUsage(),
    getUsageByType(),
    getSubscriptionDistribution(),
    getTopUsers(),
  ]);

  const sortedByType = [...byType].sort((a, b) => b.count - a.count);
  const dailyData = daily.days.map(({ date, counts }) => ({ date, ...counts }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Usage
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI generation stats and subscription analytics
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedByType.map(({ type, count }) => (
          <StatsCard key={type} title={formatTypeLabel(type)} value={count} />
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Daily Usage (30 days)
        </h2>
        <Card className="mt-3 border-border/50 shadow-none">
          <CardContent className="p-5">
            <UsageChart data={dailyData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Subscriptions
          </h2>
          <Card className="mt-3 border-border/50 shadow-none">
            <CardContent className="p-5">
              {Object.entries(subscriptions).length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(subscriptions).map(([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            status === "active"
                              ? "bg-primary"
                              : status === "expired"
                                ? "bg-destructive"
                                : "bg-muted-foreground/40"
                          }`}
                        />
                        <span className="text-sm capitalize text-foreground">
                          {status}
                        </span>
                      </div>
                      <span className="font-mono text-sm font-semibold tabular-nums">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Top Users
          </h2>
          <Card className="mt-3 border-border/50 shadow-none overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    User
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Generations
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No data
                    </TableCell>
                  </TableRow>
                ) : (
                  topUsers.map((u, i) => (
                    <TableRow key={u.userId}>
                      <TableCell className="text-sm">
                        <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                          {i + 1}
                        </span>
                        {u.name}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium tabular-nums">
                        {u.count.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
