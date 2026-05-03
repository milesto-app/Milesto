import Link from "next/link";

import { listCoaches } from "@/lib/admin-api/resources/coaches";
import type { AdminCoachSummary } from "@/lib/admin-api/types";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";

export default async function CoachesPage() {
  const coaches = await listCoaches();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Coaches"
        description="Static coach catalogue with current assignment counts."
      />
      {coaches.length === 0 ? (
        <EmptyState title="No coaches configured" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {coaches.map((coach) => (
            <CoachCard key={coach.id} coach={coach} />
          ))}
        </div>
      )}
    </div>
  );
}

function CoachCard({ coach }: { coach: AdminCoachSummary }) {
  return (
    <Card className="border-border/60 shadow-none transition-colors hover:border-border">
      <CardContent className="p-5">
        <Link href={`/admin/coaches/${coach.id}`} className="block space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-foreground">
                {coach.displayName.en}
              </p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {coach.personality}
              </p>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {coach.userCount.toLocaleString()} users
            </span>
          </div>
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {coach.description.en}
          </p>
        </Link>
      </CardContent>
    </Card>
  );
}
