import { listDevices } from "@/lib/admin-api/resources/notifications";
import {
  readPage,
  readPerPage,
  readString,
} from "@/lib/admin-api/search-params";
import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";

import { DevicesTable } from "../_components/devices-table";

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = readPage(sp);
  const perPage = readPerPage(sp);
  const userId = readString(sp, "userId");

  const data = await listDevices({
    page,
    perPage,
    ...(userId ? { userId } : {}),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Devices"
        description="Registered APNs tokens, with platform and environment."
      />
      <FilterBar searchPlaceholder="Filter by userId via the URL" facets={[]} />
      <DevicesTable
        devices={data.devices}
        total={data.total}
        pageCount={Math.max(1, data.totalPages)}
      />
    </div>
  );
}
