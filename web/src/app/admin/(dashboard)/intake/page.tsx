import { listIntakeBatches } from "@/lib/admin-api/resources/intake";
import {
  readPage,
  readPerPage,
  readString,
} from "@/lib/admin-api/search-params";
import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";

import { IntakeBatchesTable } from "./_components/intake-batches-table";

export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = readPage(sp);
  const perPage = readPerPage(sp);
  const goalId = readString(sp, "goalId");

  const batches = await listIntakeBatches({
    page,
    perPage,
    ...(goalId ? { goalId } : {}),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Intake batches"
        description="Inspect intake batches."
      />
      <div className="space-y-3">
        <FilterBar
          searchPlaceholder="Filter by goalId via the URL"
          facets={[]}
        />
        <IntakeBatchesTable
          batches={batches.batches}
          total={batches.total}
          pageCount={Math.max(1, batches.totalPages)}
        />
      </div>
    </div>
  );
}
