"use client";

import { useCallback, useMemo, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Rows3, Rows4 } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
} from "@tanstack/react-table";
import {
  parseAsInteger,
  parseAsString,
  useQueryState,
  useQueryStates,
} from "nuqs";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/admin/empty-state";

import {
  DataTablePagination,
} from "@/components/admin/data-table/pagination";
import {
  parseSort,
  serializeSort,
  type SortState,
} from "@/components/admin/data-table/column-helpers";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;
const DEFAULT_DENSITY: Density = "comfortable";

export type Density = "comfortable" | "compact";

type DensityHandle = {
  density: Density;
  setDensity: (next: Density) => void;
};

export type DataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  /** Total row count from the API; null if unknown. Used for pagination range. */
  total: number | null;
  /** Total number of pages from the API. Use `Math.ceil(total / perPage)` if not provided server-side. */
  pageCount: number;
  /** localStorage key for the per-table density preference. */
  densityKey?: string;
  /** Render an actionable empty state when `data.length === 0`. */
  emptyState?: { title: string; description?: string };
  /** Stable row id selector — defaults to indexing by row position. */
  getRowId?: (row: TData, index: number) => string;
  /** Click handler invoked when a row is clicked (e.g. to drill into detail). */
  onRowClick?: (row: TData) => void;
  /** Page-size options for the rows-per-page selector. */
  perPageOptions?: number[];
  className?: string;
};

export function DataTable<TData>({
  data,
  columns,
  total,
  pageCount,
  densityKey,
  emptyState,
  getRowId,
  onRowClick,
  perPageOptions,
  className,
}: DataTableProps<TData>) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const density = useDensity(densityKey);

  const [pagination, setPagination] = useQueryStates(
    {
      page: parseAsInteger.withDefault(DEFAULT_PAGE),
      perPage: parseAsInteger.withDefault(DEFAULT_PER_PAGE),
    },
    { shallow: false, startTransition, clearOnDefault: true },
  );

  const [sortParam, setSortParam] = useQueryState(
    "sort",
    parseAsString.withOptions({
      shallow: false,
      startTransition,
      clearOnDefault: true,
    }),
  );

  const sort = useMemo<SortState>(() => parseSort(sortParam), [sortParam]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount,
    ...(getRowId ? { getRowId } : {}),
    state: {
      pagination: {
        pageIndex: Math.max(0, pagination.page - 1),
        pageSize: pagination.perPage,
      },
      sorting: sort
        ? [{ id: sort.id, desc: sort.direction === "desc" }]
        : [],
    },
    meta: {
      sort,
      onSortChange: (next: SortState) => {
        void setSortParam(serializeSort(next));
      },
    },
  });

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-end">
        <DensityToggle density={density.density} onChange={density.setDensity} />
      </div>
      <div
        data-density={density.density}
        className="overflow-hidden rounded-xl border border-border/60 bg-card"
      >
        <div className="max-h-[calc(100vh-18rem)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{
                        width:
                          header.column.columnDef.size !== undefined
                            ? `${header.column.columnDef.size}px`
                            : undefined,
                      }}
                      className={cn(
                        "h-[var(--row-h-header,2.25rem)] text-xs font-medium uppercase tracking-wider text-muted-foreground",
                        density.density === "compact" &&
                          "[--row-h-header:1.875rem]",
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="p-0">
                    <EmptyState
                      title={emptyState?.title ?? "No results"}
                      {...(emptyState?.description !== undefined
                        ? { description: emptyState.description }
                        : {})}
                      className="border-0 bg-transparent py-10"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <DataTableRow
                    key={row.id}
                    row={row}
                    density={density.density}
                    onRowClick={onRowClick}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <DataTablePagination
        page={pagination.page}
        perPage={pagination.perPage}
        total={total}
        pageCount={pageCount}
        onPageChange={(next) => {
          void setPagination({ page: next });
          router.refresh();
        }}
        onPerPageChange={(next) => {
          void setPagination({ page: 1, perPage: next });
          router.refresh();
        }}
        {...(perPageOptions ? { perPageOptions } : {})}
      />
    </div>
  );
}

function DataTableRow<TData>({
  row,
  density,
  onRowClick,
}: {
  row: Row<TData>;
  density: Density;
  onRowClick?: (row: TData) => void;
}) {
  const interactive = onRowClick !== undefined;
  return (
    <TableRow
      data-density={density}
      onClick={interactive ? () => onRowClick(row.original) : undefined}
      className={cn(
        "h-[var(--row-h,2.75rem)]",
        density === "compact" && "[--row-h:2rem]",
        interactive && "cursor-pointer",
      )}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id} className="text-sm">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

function DensityToggle({
  density,
  onChange,
}: {
  density: Density;
  onChange: (next: Density) => void;
}) {
  const next = density === "comfortable" ? "compact" : "comfortable";
  const Icon = density === "comfortable" ? Rows3 : Rows4;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={
        density === "comfortable"
          ? "Switch to compact density"
          : "Switch to comfortable density"
      }
      title={`Switch to ${next} density`}
      onClick={() => onChange(next)}
      className="text-muted-foreground hover:text-foreground"
    >
      <Icon className="size-3" aria-hidden />
    </Button>
  );
}

const DENSITY_STORAGE_EVENT = "admin:density-changed";

function readDensity(storageKey?: string): Density {
  if (!storageKey || typeof window === "undefined") return DEFAULT_DENSITY;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "comfortable" || stored === "compact") return stored;
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_DENSITY;
}

function subscribeDensity(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(DENSITY_STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(DENSITY_STORAGE_EVENT, callback);
  };
}

function useDensity(storageKey?: string): DensityHandle {
  const subscribe = useCallback(
    (callback: () => void) => subscribeDensity(callback),
    [],
  );
  const getSnapshot = useCallback(
    () => readDensity(storageKey),
    [storageKey],
  );
  const getServerSnapshot = useCallback(() => DEFAULT_DENSITY, []);

  const density = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setDensity = useCallback(
    (next: Density) => {
      if (!storageKey || typeof window === "undefined") return;
      try {
        window.localStorage.setItem(storageKey, next);
        window.dispatchEvent(new Event(DENSITY_STORAGE_EVENT));
      } catch {
        // ignore quota errors
      }
    },
    [storageKey],
  );

  return { density, setDensity };
}
