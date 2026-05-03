import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

export type SortState = {
  id: string;
  direction: SortDirection;
} | null;

export function nextSortDirection(
  current: SortState,
  columnId: string,
): SortState {
  if (current?.id !== columnId) return { id: columnId, direction: "desc" };
  if (current.direction === "desc") return { id: columnId, direction: "asc" };
  return null;
}

export function serializeSort(state: SortState): string | null {
  if (!state) return null;
  return state.direction === "desc" ? `-${state.id}` : state.id;
}

export function parseSort(serialized: string | null | undefined): SortState {
  if (!serialized) return null;
  if (serialized.startsWith("-")) {
    return { id: serialized.slice(1), direction: "desc" };
  }
  return { id: serialized, direction: "asc" };
}

export function SortableHeader({
  columnId,
  sort,
  onSortChange,
  align = "start",
  children,
}: {
  columnId: string;
  sort: SortState;
  onSortChange: (next: SortState) => void;
  align?: "start" | "end";
  children: React.ReactNode;
}) {
  const isActive = sort?.id === columnId;
  const direction = isActive ? sort.direction : null;

  return (
    <button
      type="button"
      onClick={() => onSortChange(nextSortDirection(sort, columnId))}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none",
        align === "end" && "flex-row-reverse",
      )}
      aria-label={`Sort by ${columnId}`}
    >
      <span>{children}</span>
      <SortIcon direction={direction} />
    </button>
  );
}

function SortIcon({ direction }: { direction: SortDirection | null }) {
  const iconClass = "size-3";
  if (direction === "asc") return <ArrowUp className={iconClass} aria-hidden />;
  if (direction === "desc") return <ArrowDown className={iconClass} aria-hidden />;
  return (
    <ArrowUpDown
      className={cn(iconClass, "opacity-50")}
      aria-hidden
    />
  );
}

/**
 * Convenience identity helper that pins TanStack's column generic so call sites
 * keep `accessorKey` autocompletion against the row type.
 */
export function defineColumns<TData, TValue = unknown>(
  columns: ColumnDef<TData, TValue>[],
): ColumnDef<TData, TValue>[] {
  return columns;
}
