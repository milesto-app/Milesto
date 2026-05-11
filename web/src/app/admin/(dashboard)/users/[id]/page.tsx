import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { formatDate } from "@/lib/format";
import {
  getUser,
  getUserDevices,
  getUserGoals,
  getUserSubscription,
  getUserUsage,
} from "@/lib/admin-api/resources/users";
import { ApiError } from "@/lib/admin-api/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/admin/copy-button";
import { GoalDetailCard } from "@/components/admin/goal-detail-card";

import { UserDangerZone } from "./_components/user-danger-zone";
import { UserDevicesPanel } from "./_components/user-devices-panel";
import { UserEditButton } from "./_components/user-edit-form";
import {
  GrantProButton,
  RefreshSubscriptionButton,
  RevokeProButton,
} from "./_components/user-pro-actions";
import { UserSubscriptionPanel } from "./_components/user-subscription-panel";
import { UserTabs } from "./_components/user-tabs";
import { UserUsagePanel } from "./_components/user-usage-panel";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let user;
  let goals;
  let usage;
  let subscription;
  let devices;
  try {
    [user, goals, usage, subscription, devices] = await Promise.all([
      getUser(id),
      getUserGoals(id),
      getUserUsage(id),
      getUserSubscription(id),
      getUserDevices(id),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

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
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground">
                  {user.email}
                </h1>
                <CopyButton value={user.email} />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
                  "No name set"}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {user.id}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
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
                <Badge variant="secondary" className="font-medium capitalize">
                  {user.subscriptionStatus.replace(/_/g, " ")}
                </Badge>
              )}
              <UserEditButton user={user} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-y-4 gap-x-8 sm:grid-cols-4">
            <Field label="Role" value={user.role} />
            <Field
              label="Coach"
              value={user.coachId == null ? null : String(user.coachId)}
            />
            <Field label="Language" value={user.language} />
            <Field label="Joined" value={formatDate(user.createdAt)} mono />
            <Field label="Goals" value={String(user.goalCount)} />
            <Field label="Timezone" value={user.timezone} />
            <Field
              label="Birth year"
              value={user.birthYear == null ? null : String(user.birthYear)}
            />
            <Field label="Subscription" value={user.subscriptionStatus} />
          </div>
        </CardContent>
      </Card>

      <UserTabs
        overview={
          <div className="rounded-xl border border-border/50 bg-card px-5 py-4 text-sm text-muted-foreground">
            <p>
              {goals.length} goal{goals.length === 1 ? "" : "s"} ·{" "}
              {usage.totalGenerations} generation
              {usage.totalGenerations === 1 ? "" : "s"} · {devices.length}{" "}
              device{devices.length === 1 ? "" : "s"}
            </p>
            <p className="mt-2 text-xs">
              Use the tabs above to drill into goals, generations, billing, or
              device tokens.
            </p>
          </div>
        }
        goals={
          goals.length === 0 ? (
            <div className="rounded-xl border border-border/50 bg-card px-5 py-12 text-center text-sm text-muted-foreground">
              No goals yet
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => (
                <Link
                  key={goal.id}
                  href={`/admin/goals/${goal.id}`}
                  className="block transition-opacity hover:opacity-80"
                >
                  <GoalDetailCard goal={goal} />
                </Link>
              ))}
            </div>
          )
        }
        usage={<UserUsagePanel usage={usage} />}
        subscription={
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <GrantProButton userId={user.id} />
              <RevokeProButton userId={user.id} />
              <RefreshSubscriptionButton userId={user.id} />
            </div>
            <UserSubscriptionPanel subscription={subscription} />
          </div>
        }
        devices={<UserDevicesPanel devices={devices} />}
      />

      <UserDangerZone userId={user.id} email={user.email} />
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-0.5 ${
          mono ? "font-mono text-xs tabular-nums" : "text-sm font-medium"
        }`}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}
