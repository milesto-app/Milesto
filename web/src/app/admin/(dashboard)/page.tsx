import Link from "next/link";

import {
  getOverviewStats as getApiOverviewStats,
  getRecentGoals as getApiRecentGoals,
} from "@/lib/admin-api/resources/overview";
import {
  getOverviewStats,
  getRecentGoals,
} from "@/lib/supabase/queries/overview";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      return (
        <Badge variant="secondary" className="font-medium">
          Intake
        </Badge>
      );
    case "intake_completed":
      return (
        <Badge variant="secondary" className="font-medium">
          Intake Done
        </Badge>
      );
    case "profile_generating":
      return (
        <Badge variant="outline" className="font-medium">
          Profiling
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
    case "roadmap_generating":
      return (
        <Badge variant="outline" className="font-medium">
          Roadmap Gen
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

type DashboardSearchParams = Promise<Record<string, string | string[] | undefined>>;

type RecentGoalRow = {
  id: string;
  title: string;
  status: string;
  userId: string;
  userName: string;
  createdAt: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: DashboardSearchParams;
}) {
  const params = (await searchParams) ?? {};
  const useApi = params.api === "1";

  let stats: {
    totalUsers: number;
    activeGoals: number;
    proSubscriptions: number;
    todayGenerations: number;
  };
  let recentGoals: RecentGoalRow[];

  if (useApi) {
    const [apiStats, apiGoals] = await Promise.all([
      getApiOverviewStats(),
      getApiRecentGoals(),
    ]);
    stats = apiStats;
    recentGoals = apiGoals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      status: goal.status,
      userId: goal.userId,
      userName: goal.userName,
      createdAt: goal.createdAt,
    }));
  } else {
    const [supabaseStats, supabaseGoals] = await Promise.all([
      getOverviewStats(),
      getRecentGoals(),
    ]);
    stats = supabaseStats;
    recentGoals = supabaseGoals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      status: goal.status,
      userId: goal.user_id,
      userName: goal.userName,
      createdAt: goal.created_at,
    }));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Key metrics and recent activity
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Users" value={stats.totalUsers} />
        <StatsCard title="Active Goals" value={stats.activeGoals} />
        <StatsCard title="Pro Subscriptions" value={stats.proSubscriptions} />
        <StatsCard title="Today's Generations" value={stats.todayGenerations} />
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Goals
        </h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-border/50 bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Title
                </TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  User
                </TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Created
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentGoals.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No goals yet
                  </TableCell>
                </TableRow>
              ) : (
                recentGoals.map((goal) => (
                  <TableRow key={goal.id} className="group">
                    <TableCell className="max-w-[240px] truncate text-sm font-medium">
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
                      {new Date(goal.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
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
