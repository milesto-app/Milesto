import {
  PageHeaderSkeleton,
  TableSkeleton,
} from "@/components/admin/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <Skeleton className="h-9 w-[280px]" />
      <TableSkeleton rows={8} columns={4} />
    </div>
  );
}
