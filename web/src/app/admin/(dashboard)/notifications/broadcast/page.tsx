import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getSubscriptionDistribution } from "@/lib/admin-api/resources/subscriptions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";

import { BroadcastComposer } from "./_components/broadcast-composer";

export default async function BroadcastPage() {
  const distribution = await getSubscriptionDistribution().catch(
    () => ({}) as Record<string, number>,
  );

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/admin/notifications" />}
        className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Notifications
      </Button>
      <PageHeader
        title="Broadcast"
        description="Send a push notification to a user segment."
      />
      <BroadcastComposer distribution={distribution} />
    </div>
  );
}
