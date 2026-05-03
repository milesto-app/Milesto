import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

type IconComponent = ComponentType<{ className?: string }>;

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: IconComponent;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-default bg-surface-2/60 px-6 py-16 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="flex size-10 items-center justify-center rounded-full bg-surface-1 text-text-secondary">
          <Icon className="size-5" />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        {description ? (
          <p className="text-sm text-text-secondary">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
