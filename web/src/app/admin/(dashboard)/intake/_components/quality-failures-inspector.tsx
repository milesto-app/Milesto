"use client";

import { useState } from "react";

import type {
  AdminIntakeBatch,
  AdminIntakeQualityFailures,
} from "@/lib/admin-api/types";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/admin/empty-state";
import { JsonViewer } from "@/components/admin/json-viewer";

function formatDate(value: string): string {
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

export function QualityFailuresInspector({
  data,
}: {
  data: AdminIntakeQualityFailures;
}) {
  const [active, setActive] = useState<AdminIntakeBatch | null>(
    data.batches[0] ?? null,
  );

  if (data.batches.length === 0) {
    return (
      <EmptyState
        title="No quality failures yet"
        description={`Threshold: ${data.threshold.toFixed(2)}`}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
      <ul className="space-y-1 rounded-xl border border-border/60 bg-card p-2 max-h-[60vh] overflow-y-auto">
        {data.batches.map((batch) => {
          const isActive = active?.id === batch.id;
          return (
            <li key={batch.id}>
              <button
                type="button"
                onClick={() => setActive(batch)}
                className={cn(
                  "flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  isActive ? "bg-muted" : "hover:bg-muted/60",
                )}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-muted-foreground">
                    {batch.goalId.slice(0, 8)}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {batch.qualityScore !== null
                      ? batch.qualityScore.toFixed(2)
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    Batch #{batch.batchNumber}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(batch.createdAt)}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="rounded-xl border border-border/60 bg-card p-4">
        {active ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium">Batch #{active.batchNumber}</p>
              <span className="text-xs text-muted-foreground tabular-nums">
                Quality{" "}
                {active.qualityScore !== null
                  ? active.qualityScore.toFixed(2)
                  : "—"}{" "}
                / threshold {data.threshold.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Answered {active.answeredCount} / {active.questionCount} ·{" "}
              {formatDate(active.createdAt)}
            </p>
            <JsonViewer value={active} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
