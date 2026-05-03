"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function DataTablePagination({
  page,
  perPage,
  total,
  pageCount,
  onPageChange,
  onPerPageChange,
  perPageOptions = DEFAULT_PER_PAGE_OPTIONS,
  className,
}: {
  page: number;
  perPage: number;
  total: number | null;
  pageCount: number;
  onPageChange: (next: number) => void;
  onPerPageChange?: (next: number) => void;
  perPageOptions?: number[];
  className?: string;
}) {
  const canPrev = page > 1;
  const canNext = page < pageCount;
  const showRange = total !== null && total > 0;
  const start = showRange ? (page - 1) * perPage + 1 : 0;
  const end = showRange ? Math.min(start + perPage - 1, total) : 0;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-1 py-2 text-xs text-text-secondary",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {showRange ? (
          <span className="tabular-nums">
            {start}–{end} of {total.toLocaleString()}
          </span>
        ) : (
          <span>
            Page {page} of {Math.max(pageCount, 1)}
          </span>
        )}
        {onPerPageChange ? (
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline">Rows</span>
            <Select
              value={String(perPage)}
              onValueChange={(value) => onPerPageChange(Number(value))}
            >
              <SelectTrigger className="h-7 min-w-[4.5rem] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {perPageOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Previous page"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-3" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Next page"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-3" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
