import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { getUserDetail } from "@/lib/supabase/queries/users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GoalDetailCard } from "@/components/admin/goal-detail-card";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUserDetail(id);

  if (!user) notFound();

  const isProActive =
    user.subscriptionStatus === "active" &&
    user.subscriptionExpiresAt &&
    new Date(user.subscriptionExpiresAt) > new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/admin/users" />}
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Users
        </Button>
      </div>

      <Card className="border-border/50 shadow-none">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                {user.email}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
                  "No name set"}
              </p>
            </div>
            {isProActive ? (
              <Badge className="border-0 bg-primary/10 text-primary font-medium">
                Pro
              </Badge>
            ) : user.subscriptionStatus === "expired" ? (
              <Badge
                variant="destructive"
                className="border-0 bg-destructive/10 text-destructive font-medium"
              >
                Expired
              </Badge>
            ) : (
              <Badge variant="secondary" className="font-medium">
                Free
              </Badge>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-y-4 gap-x-8 sm:grid-cols-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Coach
              </p>
              <p className="mt-0.5 text-sm font-medium">
                {user.coachId ?? "\u2014"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Language
              </p>
              <p className="mt-0.5 text-sm font-medium">
                {user.language ?? "\u2014"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Joined
              </p>
              <p className="mt-0.5 text-sm font-medium tabular-nums">
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Goals
              </p>
              <p className="mt-0.5 text-sm font-medium">{user.goals.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Goals
        </h2>
        {user.goals.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No goals yet</p>
        ) : (
          <div className="mt-3 space-y-3">
            {user.goals.map((goal) => (
              <GoalDetailCard key={goal.id} goal={goal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
