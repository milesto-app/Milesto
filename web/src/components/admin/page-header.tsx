import type { ReactNode } from "react";

import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  lastSyncedAt,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  lastSyncedAt?: Date | string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {lastSyncedAt ? <LastSyncedChip at={lastSyncedAt} /> : null}
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

function LastSyncedChip({ at }: { at: Date | string }) {
  const label = formatDateTime(at);
  if (label === "—") return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
      aria-live="polite"
    >
      <span className="size-1.5 rounded-full bg-primary/70" aria-hidden />
      Synced {label}
    </span>
  );
}
