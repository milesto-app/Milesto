import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type SurfaceTone = "default" | "elevated" | "sunken" | "muted";
type SurfacePad = "none" | "sm" | "md" | "lg";

export type SurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  tone?: SurfaceTone;
  pad?: SurfacePad;
  children?: ReactNode;
};

const TONE_CLASSES: Record<SurfaceTone, string> = {
  default: "border-border/50 bg-card",
  elevated: "border-border/60 bg-card shadow-sm",
  sunken: "border-border/40 bg-muted/40",
  muted: "border-border/40 bg-muted/30",
};

const PAD_CLASSES: Record<SurfacePad, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export function Surface({
  as: Tag = "div",
  tone = "default",
  pad = "lg",
  className,
  children,
  ...rest
}: SurfaceProps) {
  return (
    <Tag
      className={cn(
        "rounded-xl border",
        TONE_CLASSES[tone],
        PAD_CLASSES[pad],
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function SurfaceHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border/40 px-5 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
