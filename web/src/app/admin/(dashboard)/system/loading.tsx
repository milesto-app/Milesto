import {
  PageHeaderSkeleton,
  StatCardSkeleton,
  TableSkeleton,
} from "@/components/admin/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function SystemLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <Skeleton className="h-9 w-[280px]" />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <TableSkeleton rows={6} columns={4} />
    </div>
  );
}
