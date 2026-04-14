import type { UserGoal } from "@/lib/supabase/queries/users";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="border-0 bg-primary/10 text-primary font-medium">Active</Badge>;
    case "intake_in_progress":
      return <Badge variant="secondary" className="font-medium">Intake</Badge>;
    case "intake_completed":
      return <Badge variant="secondary" className="font-medium">Intake Done</Badge>;
    case "profile_generating":
      return <Badge variant="outline" className="font-medium">Profiling</Badge>;
    case "profile_generation_failed":
      return <Badge variant="destructive" className="border-0 bg-destructive/10 text-destructive font-medium">Profile Failed</Badge>;
    case "roadmap_generating":
      return <Badge variant="outline" className="font-medium">Generating Roadmap</Badge>;
    default:
      return <Badge variant="secondary" className="font-medium">{status}</Badge>;
  }
}

export function GoalDetailCard({ goal }: { goal: UserGoal }) {
  const completionPercent =
    goal.totalTasks > 0
      ? Math.round((goal.completedTasks / goal.totalTasks) * 100)
      : 0;

  return (
    <Card className="border-border/50 shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground leading-tight">
            {goal.title}
          </h3>
          {statusBadge(goal.status)}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Target
            </p>
            <p className="mt-0.5 text-sm font-medium">
              {goal.targetDate
                ? new Date(goal.targetDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "\u2014"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Milestones
            </p>
            <p className="mt-0.5 text-sm font-medium">{goal.milestoneCount}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Tasks
            </p>
            <p className="mt-0.5 text-sm font-medium tabular-nums">
              {goal.completedTasks}/{goal.totalTasks}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Progress
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {completionPercent}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
