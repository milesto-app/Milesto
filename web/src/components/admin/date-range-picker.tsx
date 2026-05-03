"use client";

import { useTransition } from "react";
import { CalendarRange } from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const DEFAULT_RANGE_DAYS = 30;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: isoDate(from), to: isoDate(to) };
}

export type DateRangeQuery = {
  from: string;
  to: string;
};

export function readDateRange(
  searchParams: Record<string, string | string[] | undefined>,
  rangeDays: number = DEFAULT_RANGE_DAYS,
): DateRangeQuery {
  const fallback = defaultRange(rangeDays);
  const fromRaw = searchParams["from"];
  const toRaw = searchParams["to"];
  const from = typeof fromRaw === "string" && fromRaw ? fromRaw : fallback.from;
  const to = typeof toRaw === "string" && toRaw ? toRaw : fallback.to;
  return { from, to };
}

export function dateRangeToDays(range: DateRangeQuery): number {
  const fromDate = new Date(`${range.from}T00:00:00Z`);
  const toDate = new Date(`${range.to}T23:59:59Z`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return DEFAULT_RANGE_DAYS;
  }
  const ms = toDate.getTime() - fromDate.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, days);
}

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
