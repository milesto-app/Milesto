import type { ComponentType } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleSlash,
  Clock,
  HelpCircle,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type StatusVariant =
  | "active"
  | "pro"
  | "pending"
  | "expired"
  | "cancelled"
  | "revoked"
  | "failed"
  | "healthy"
  | "degraded"
  | "down"
  | "info"
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
    className: "bg-brand-bg-soft text-text-brand",
  },
  pro: {
    label: "Pro",
    icon: CheckCircle2,
    className: "bg-brand-bg-soft text-text-brand",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-status-info/10 text-status-info",
  },
  expired: {
    label: "Expired",
    icon: AlertTriangle,
    className: "bg-status-warning/15 text-status-warning",
  },
  cancelled: {
    label: "Cancelled",
    icon: CircleSlash,
    className: "bg-status-danger/12 text-status-danger",
  },
  revoked: {
    label: "Revoked",
    icon: Ban,
    className: "bg-status-danger/12 text-status-danger",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-status-danger/12 text-status-danger",
  },
  healthy: {
    label: "Healthy",
    icon: CheckCircle2,
    className: "bg-status-success/12 text-status-success",
  },
  degraded: {
    label: "Degraded",
    icon: AlertTriangle,
    className: "bg-status-warning/15 text-status-warning",
  },
  down: {
    label: "Down",
    icon: XCircle,
    className: "bg-status-danger/12 text-status-danger",
  },
  info: {
    label: "Info",
    icon: HelpCircle,
    className: "bg-status-info/10 text-status-info",
  },
  unknown: {
    label: "Unknown",
    icon: HelpCircle,
    className: "border border-border-subtle text-text-tertiary",
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
