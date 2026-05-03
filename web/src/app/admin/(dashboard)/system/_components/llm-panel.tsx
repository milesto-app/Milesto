import type {
  AdminLlmHealthReport,
  AdminLlmProbe,
} from "@/lib/admin-api/types";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/status-badge";

export function LlmPanel({ data }: { data: AdminLlmHealthReport }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <LlmCard name="OpenRouter" probe={data.openrouter} />
      <LlmCard name="Cohere" probe={data.cohere} />
    </div>
  );
}

function LlmCard({ name, probe }: { name: string; probe: AdminLlmProbe }) {
  return (
    <Card className="border-border/60 shadow-none">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <StatusBadge
            variant={probe.status === "healthy" ? "healthy" : "down"}
            label={probe.status}
          />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {probe.latencyMs}
          </span>
          <span className="text-xs text-muted-foreground">ms</span>
        </div>
        {probe.model ? (
          <p className="font-mono text-[11px] text-muted-foreground">
            {probe.model}
          </p>
        ) : null}
        {probe.error ? (
          <p className="text-xs text-destructive">{probe.error}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
