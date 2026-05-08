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
  default: "border-border-default bg-surface-2",
  elevated: "border-border-default bg-surface-3",
  sunken: "border-border-subtle bg-surface-1",
  muted: "border-border-subtle bg-surface-2/60",
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
