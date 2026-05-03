import type { AdminHealthReport } from "@/lib/admin-api/types";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/status-badge";

export function ServicesPanel({ data }: { data: AdminHealthReport }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <ServiceCard
        name="Backend API"
        status={data.backend.status}
        responseTimeMs={data.backend.responseTimeMs}
      />
      <ServiceCard
        name="Supabase"
        status={data.supabase.status}
        responseTimeMs={data.supabase.responseTimeMs}
      />
      <Card className="border-border/60 shadow-none">
        <CardContent className="space-y-2 p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Notification queue
          </p>
          <p className="text-2xl font-semibold tabular-nums">
            {data.queueDepth ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground">Pending dispatches</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ServiceCard({
  name,
  status,
  responseTimeMs,
}: {
  name: string;
  status: "healthy" | "unhealthy";
  responseTimeMs: number;
}) {
  return (
    <Card className="border-border/60 shadow-none">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <StatusBadge
            variant={status === "healthy" ? "healthy" : "down"}
            label={status}
          />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {responseTimeMs}
          </span>
          <span className="text-xs text-muted-foreground">ms</span>
        </div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Response time
        </p>
      </CardContent>
    </Card>
  );
}
