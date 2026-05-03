import Link from "next/link";
import { ArrowLeft, Megaphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";

export default function BroadcastPage() {
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
      <EmptyState
        icon={Megaphone}
        title="Coming in Phase 4"
        description="The broadcast composer (audience preview, typed SEND confirm, dry-run) ships with Phase 4b mutations."
      />
    </div>
  );
}
