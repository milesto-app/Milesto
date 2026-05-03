import type { ComponentType } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Circle,
  CircleSlash,
  Clock,
  HelpCircle,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type StatusVariant =
  | "active"
  | "pending"
  | "expired"
  | "cancelled"
  | "revoked"
  | "healthy"
  | "degraded"
  | "down"
  | "unknown";

type IconComponent = ComponentType<{ className?: string }>;

type Definition = {
  label: string;
  icon: IconComponent;
  className: string;
};

const VARIANTS: Record<StatusVariant, Definition> = {
  active: {
    label: "Active",
    icon: CheckCircle2,
    className: "bg-primary/10 text-primary",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  expired: {
    label: "Expired",
    icon: Circle,
    className: "bg-muted text-muted-foreground",
  },
  cancelled: {
    label: "Cancelled",
    icon: CircleSlash,
    className:
      "bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300",
  },
  revoked: {
    label: "Revoked",
    icon: Ban,
    className: "bg-destructive/10 text-destructive",
  },
  healthy: {
    label: "Healthy",
    icon: CheckCircle2,
    className: "bg-primary/10 text-primary",
  },
  degraded: {
    label: "Degraded",
    icon: AlertTriangle,
    className:
      "bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300",
  },
  down: {
    label: "Down",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive",
  },
  unknown: {
    label: "Unknown",
    icon: HelpCircle,
    className: "bg-muted text-muted-foreground",
  },
};

export function StatusBadge({
  variant,
  label,
  className,
}: {
  variant: StatusVariant;
  label?: string;
  className?: string;
}) {
  const def = VARIANTS[variant];
  const Icon = def.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        def.className,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      <span>{label ?? def.label}</span>
    </span>
  );
}
