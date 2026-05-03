import type { AdminSchedulerStatus } from "@/lib/admin-api/types";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/status-badge";

function formatDate(value: string | null): string {
  if (!value) return "—";
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

export function SchedulerCard({ status }: { status: AdminSchedulerStatus }) {
  return (
    <Card className="border-border/60 shadow-none">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            Notification scheduler
          </p>
          <StatusBadge
            variant={status.isRunning ? "active" : "expired"}
            label={status.isRunning ? "Running" : "Idle"}
          />
        </div>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Field label="Last run" value={formatDate(status.lastRunAt)} />
          <Field label="Next run" value={formatDate(status.nextRunAt)} />
          <Field
            label="Last batch"
            value={status.lastBatchSize.toLocaleString()}
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground tabular-nums">{value}</dd>
    </div>
  );
}
