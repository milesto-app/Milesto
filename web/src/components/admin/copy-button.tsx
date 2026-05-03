"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const COPY_FEEDBACK_MS = 1500;

export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      // Clipboard write can fail in unsecured contexts; the user will see no
      // confirmation and can retry.
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      aria-label={label ?? "Copy to clipboard"}
      onClick={handleClick}
      className={cn("text-muted-foreground hover:text-foreground", className)}
    >
      {copied ? (
        <Check className="size-3" aria-hidden />
      ) : (
        <Copy className="size-3" aria-hidden />
      )}
      {label ? <span>{copied ? "Copied" : label}</span> : null}
    </Button>
  );
}
