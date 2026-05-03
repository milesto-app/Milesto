"use client";

import { useTransition } from "react";
import { CalendarRange } from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export function DateRangePicker({ className }: { className?: string }) {
  const [, startTransition] = useTransition();
  const [{ from, to }, setRange] = useQueryStates(
    {
      from: parseAsString.withDefault(""),
      to: parseAsString.withDefault(""),
    },
    {
      shallow: false,
      startTransition,
      clearOnDefault: true,
    },
  );

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2 py-1 text-xs",
        className,
      )}
    >
      <CalendarRange
        className="size-3.5 text-muted-foreground"
        aria-hidden
      />
      <label className="sr-only" htmlFor="date-range-from">
        From
      </label>
      <Input
        id="date-range-from"
        type="date"
        value={from}
        onChange={(e) =>
          void setRange((prev) => ({ ...prev, from: e.target.value }))
        }
        className="h-7 w-[8.5rem] border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
      />
      <span className="text-muted-foreground" aria-hidden>
        →
      </span>
      <label className="sr-only" htmlFor="date-range-to">
        To
      </label>
      <Input
        id="date-range-to"
        type="date"
        value={to}
        onChange={(e) =>
          void setRange((prev) => ({ ...prev, to: e.target.value }))
        }
        className="h-7 w-[8.5rem] border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
