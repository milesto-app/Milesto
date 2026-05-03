"use client";

import { useEffect, useState } from "react";

import type { AdminHealthReport } from "@/lib/admin-api/types";
import { refreshHealth } from "@/app/admin/(dashboard)/health/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function HealthStatus({
  initialData,
}: {
  initialData: AdminHealthReport;
}) {
  const [data, setData] = useState(initialData);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const result = await refreshHealth();
        setData(result);
        setLastChecked(new Date());
      } catch {
        // keep showing last known data
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
      <p className="text-xs text-muted-foreground">
        Auto-refreshing every 30s{" "}
        {lastChecked && (
          <span className="text-muted-foreground/60">
            &middot; Last checked: {lastChecked.toLocaleTimeString()}
          </span>
        )}
      </p>
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
  const isHealthy = status === "healthy";

  return (
    <Card
      className={`border-border/50 shadow-none transition-colors ${isHealthy ? "" : "border-destructive/30 bg-destructive/3"}`}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                isHealthy
                  ? "bg-primary shadow-[0_0_8px_oklch(0.45_0.14_145/0.4)]"
                  : "bg-destructive shadow-[0_0_8px_oklch(0.55_0.22_25/0.4)]"
              }`}
            />
            <span className="text-sm font-semibold text-foreground">
              {name}
            </span>
          </div>
          <Badge
            className={`border-0 font-medium ${
              isHealthy
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {status}
          </Badge>
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {responseTimeMs}
          </span>
          <span className="text-xs text-muted-foreground">ms</span>
        </div>
        <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          Response time
        </p>
      </CardContent>
    </Card>
  );
}
