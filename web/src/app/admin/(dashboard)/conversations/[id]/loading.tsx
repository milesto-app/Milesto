import { PageHeaderSkeleton } from "@/components/admin/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ConversationDetailLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-32" />
      <PageHeaderSkeleton />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
