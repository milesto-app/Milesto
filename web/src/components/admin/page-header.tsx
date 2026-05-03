import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  lastSyncedAt,
  className,
}: {
  eyebrow?: string;
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
        {eyebrow ? (
          <p className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-serif text-[28px] font-medium italic tracking-tight text-text-primary">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-text-secondary">{description}</p>
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
      className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-2 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-text-secondary"
      aria-live="polite"
    >
      <span className="size-1.5 rounded-full bg-brand" aria-hidden />
      Synced {label}
    </span>
  );
}
