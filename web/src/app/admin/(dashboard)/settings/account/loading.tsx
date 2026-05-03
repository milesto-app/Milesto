import { PageHeaderSkeleton } from "@/components/admin/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
