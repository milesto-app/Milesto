import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ApiError } from "@/lib/admin-api/errors";
import {
  listCoachUsers,
  listCoaches,
} from "@/lib/admin-api/resources/coaches";
import { readPage, readPerPage } from "@/lib/admin-api/search-params";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";

import { CoachUsersTable } from "./_components/coach-users-table";

export default async function CoachDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  const sp = await searchParams;
  const page = readPage(sp);
  const perPage = readPerPage(sp);

  let users;
  let coaches;
  try {
    [users, coaches] = await Promise.all([
      listCoachUsers(numericId, { page, perPage }),
      listCoaches(),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const coach = coaches.find((c) => c.id === numericId);
  if (!coach) notFound();

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/admin/coaches" />}
        className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Coaches
      </Button>

      <PageHeader
        title={coach.displayName.en}
        description={coach.description.en}
      />

      <Card className="border-border/60 shadow-none">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
          <Field label="Personality" value={coach.personality} />
          <Field
            label="Assigned users"
            value={coach.userCount.toLocaleString()}
          />
          <Field label="Coach ID" value={String(coach.id)} />
        </CardContent>
      </Card>

      <CoachUsersTable
        users={users.users}
        total={users.total}
        pageCount={Math.max(1, users.totalPages)}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground tabular-nums">{value}</p>
    </div>
  );
}
