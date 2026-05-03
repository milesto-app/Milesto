import Link from "next/link";

import { formatDate } from "@/lib/format";
import {
  getActivityTimeline,
  getOverviewStats,
  getRecentGoals,
  getRecentSignups,
} from "@/lib/admin-api/resources/overview";
import { getCostEstimate } from "@/lib/admin-api/resources/usage";
import { getHealth } from "@/lib/admin-api/resources/system";
import { getSchedulerStatus } from "@/lib/admin-api/resources/notifications";
import type {
  AdminHealthReport,
  RecentGoalSummary,
  RecentSignupSummary,
} from "@/lib/admin-api/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActivityTimelineChart } from "@/components/admin/activity-timeline-chart";
import { PageHeader } from "@/components/admin/page-header";
import { StatsCard } from "@/components/admin/stats-card";

function goalStatusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <Badge className="border-0 bg-primary/10 text-primary font-medium">
          Active
        </Badge>
      );
    case "intake_in_progress":
    case "intake_completed":
      return (
        <Badge variant="secondary" className="font-medium">
          Intake
        </Badge>
      );
    case "profile_generating":
    case "roadmap_generating":
      return (
        <Badge variant="outline" className="font-medium">
          Generating
        </Badge>
      );
    case "profile_generation_failed":
      return (
        <Badge
          variant="destructive"
          className="border-0 bg-destructive/10 text-destructive font-medium"
        >
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="font-medium">
          {status}
        </Badge>
      );
  }
}

function fullName(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(" ") || "Unnamed";
}

function healthSummary(report: AdminHealthReport): {
  label: string;
  tone: "ok" | "warn" | "err";
} {
  const checks = [report.backend, report.supabase];
  const unhealthy = checks.filter((c) => c.status === "unhealthy").length;
  if (unhealthy > 0) return { label: `${unhealthy} unhealthy`, tone: "err" };
  return { label: "All systems go", tone: "ok" };
}

function toneClasses(tone: "ok" | "warn" | "err"): string {
  if (tone === "ok") return "bg-emerald-500/10 text-emerald-600";
  if (tone === "warn") return "bg-amber-500/10 text-amber-600";
  return "bg-destructive/10 text-destructive";
}

export default async function DashboardPage() {
  const [stats, recentGoals, recentSignups, timeline, cost, health, scheduler] =
    await Promise.all([
      getOverviewStats(),
      getRecentGoals(8),
      getRecentSignups(8),
      getActivityTimeline(30),
      getCostEstimate(7).catch(() => null),
      getHealth().catch(() => null),
      getSchedulerStatus().catch(() => null),
    ]);

  const healthDisplay = health ? healthSummary(health) : null;
  const costFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cost && cost.totalCostUsd < 10 ? 2 : 0,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Key metrics, recent activity, and live system state."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Users" value={stats.totalUsers} />
        <StatsCard title="Active Goals" value={stats.activeGoals} />
        <StatsCard title="Pro Subscriptions" value={stats.proSubscriptions} />
        <StatsCard title="Today's Generations" value={stats.todayGenerations} />
      </div>

      <section className="rounded-xl border border-border/50 bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Activity (30 days)
          </h2>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Signups · Goals · Messages
          </span>
        </div>
        <div className="mt-4">
          <ActivityTimelineChart data={timeline} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <LiveOpsTile
          label="System health"
          value={healthDisplay?.label ?? "Unknown"}
          tone={healthDisplay?.tone ?? "warn"}
          href="/admin/system"
        />
        <LiveOpsTile
          label="LLM cost (7d)"
          value={cost ? costFormatter.format(cost.totalCostUsd) : "—"}
          tone={cost ? "ok" : "warn"}
          href="/admin/usage?tab=cost"
          hint={
            cost && cost.coverageRatio < 1
              ? `${Math.round(cost.coverageRatio * 100)}% priced`
              : undefined
          }
        />
        <LiveOpsTile
          label="Scheduler"
          value={scheduler?.isRunning ? "Running" : "Stopped"}
          tone={scheduler?.isRunning ? "ok" : "warn"}
          href="/admin/notifications?tab=scheduler"
          hint={
            scheduler?.lastRunAt
              ? `last ${formatDate(scheduler.lastRunAt)}`
              : undefined
          }
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <RecentGoalsCard goals={recentGoals} />
        <RecentSignupsCard signups={recentSignups} />
      </section>
    </div>
  );
}

function LiveOpsTile({
  label,
  value,
  tone,
  hint,
  href,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "err";
  hint?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border/50 bg-card p-4 transition-colors hover:border-border"
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={`inline-flex h-6 items-center rounded-full px-2 text-xs font-medium ${toneClasses(tone)}`}
        >
          {value}
        </span>
        {hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </div>
    </Link>
  );
}

function RecentGoalsCard({ goals }: { goals: RecentGoalSummary[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
      <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
        <h2 className="text-sm font-semibold text-foreground">Recent goals</h2>
        <Link
          href="/admin/goals"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          View all →
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs">Title</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">User</TableHead>
            <TableHead className="text-xs">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {goals.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="py-12 text-center text-sm text-muted-foreground"
              >
                No goals yet
              </TableCell>
            </TableRow>
          ) : (
            goals.map((goal) => (
              <TableRow key={goal.id} className="group">
                <TableCell className="max-w-[180px] truncate text-sm font-medium">
                  {goal.title}
                </TableCell>
                <TableCell>{goalStatusBadge(goal.status)}</TableCell>
                <TableCell>
                  <Link
                    href={`/admin/users/${goal.userId}`}
                    className="text-sm text-muted-foreground transition-colors group-hover:text-primary"
                  >
                    {goal.userName}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground tabular-nums">
                  {formatDate(goal.createdAt)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function RecentSignupsCard({ signups }: { signups: RecentSignupSummary[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
      <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          Recent signups
        </h2>
        <Link
          href="/admin/users"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          View all →
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs">Email</TableHead>
            <TableHead className="text-xs">Name</TableHead>
            <TableHead className="text-xs">Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {signups.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="py-12 text-center text-sm text-muted-foreground"
              >
                No recent signups
              </TableCell>
            </TableRow>
          ) : (
            signups.map((signup) => (
              <TableRow key={signup.id} className="group">
                <TableCell className="max-w-[220px] truncate text-sm font-medium">
                  <Link
                    href={`/admin/users/${signup.id}`}
                    className="transition-colors group-hover:text-primary"
                  >
                    {signup.email}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {fullName(signup.firstName, signup.lastName)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground tabular-nums">
                  {formatDate(signup.createdAt)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
