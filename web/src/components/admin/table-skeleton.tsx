import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({
  rows = 8,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border border-border-default bg-surface-2 p-3",
        className,
      )}
    >
      <div className="flex gap-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`r-${r}`} className="flex gap-3 py-1.5">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={`r-${r}-c-${c}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-8 w-28" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border-default bg-surface-2 p-4 space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-20" />
    </div>
  );
}
