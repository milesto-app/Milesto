import Link from "next/link";
import { Megaphone } from "lucide-react";

import {
  getSchedulerStatus,
  listDevices,
  listSends,
} from "@/lib/admin-api/resources/notifications";
import {
  readPage,
  readPerPage,
  readString,
} from "@/lib/admin-api/search-params";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";

import { DevicesTable } from "./_components/devices-table";
import { NotificationsTabs } from "./_components/notifications-tabs";
import { SchedulerCard } from "./_components/scheduler-card";
import { SendsTable } from "./_components/sends-table";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = readPage(sp);
  const perPage = readPerPage(sp);
  const userId = readString(sp, "userId");

  const [sends, devices, scheduler] = await Promise.all([
    listSends({ page, perPage, ...(userId ? { userId } : {}) }),
    listDevices({ page: 1, perPage: 25 }),
    getSchedulerStatus(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description="Push delivery history, registered devices, and scheduler status."
        actions={
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/admin/notifications/broadcast" />}
            className="gap-1.5"
          >
            <Megaphone className="size-3.5" />
            Broadcast
          </Button>
        }
      />
      <NotificationsTabs
        sends={
          <div className="space-y-3">
            <FilterBar
              searchPlaceholder="Filter by userId via the URL"
              facets={[]}
            />
            <SendsTable
              sends={sends.sends}
              total={sends.total}
              pageCount={Math.max(1, sends.totalPages)}
            />
          </div>
        }
        devices={
          <DevicesTable
            devices={devices.devices}
            total={devices.total}
            pageCount={Math.max(1, devices.totalPages)}
          />
        }
        scheduler={<SchedulerCard status={scheduler} />}
      />
    </div>
  );
}
