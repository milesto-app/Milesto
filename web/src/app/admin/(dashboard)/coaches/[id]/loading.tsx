import {
  PageHeaderSkeleton,
  TableSkeleton,
} from "@/components/admin/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function CoachDetailLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-24" />
      <PageHeaderSkeleton />
      <Skeleton className="h-24 w-full" />
      <TableSkeleton rows={8} columns={3} />
    </div>
  );
}
