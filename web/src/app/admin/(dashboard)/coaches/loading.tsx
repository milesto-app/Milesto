import { PageHeaderSkeleton } from "@/components/admin/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function CoachesLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
