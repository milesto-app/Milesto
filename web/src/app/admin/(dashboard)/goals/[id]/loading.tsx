import {
  PageHeaderSkeleton,
  TableSkeleton,
} from "@/components/admin/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function GoalDetailLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-24" />
      <PageHeaderSkeleton />
      <Skeleton className="h-9 w-[420px]" />
      <TableSkeleton rows={6} columns={2} />
    </div>
  );
}
