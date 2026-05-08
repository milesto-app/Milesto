import type { ColumnDef } from "@tanstack/react-table";

export type SortDirection = "asc" | "desc";

export type SortState = {
  id: string;
  direction: SortDirection;
} | null;

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

/**
 * Convenience identity helper that pins TanStack's column generic so call sites
 * keep `accessorKey` autocompletion against the row type.
 */
export function defineColumns<TData, TValue = unknown>(
  columns: ColumnDef<TData, TValue>[],
): ColumnDef<TData, TValue>[] {
  return columns;
}
