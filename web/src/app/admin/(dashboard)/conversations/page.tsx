import { listConversations } from "@/lib/admin-api/resources/conversations";
import {
  readPage,
  readPerPage,
  readString,
} from "@/lib/admin-api/search-params";
import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";

import { ConversationsTable } from "./_components/conversations-table";

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = readPage(sp);
  const perPage = readPerPage(sp);
  const goalId = readString(sp, "goalId");
  const userId = readString(sp, "userId");

  const data = await listConversations({
    page,
    perPage,
    ...(goalId ? { goalId } : {}),
    ...(userId ? { userId } : {}),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Conversations"
        description="Coach transcripts grouped by goal."
      />
      <FilterBar
        searchPlaceholder="Filter by goalId or userId in URL"
        facets={[]}
      />
      <ConversationsTable
        conversations={data.conversations}
        total={data.total}
        pageCount={Math.max(1, data.totalPages)}
      />
    </div>
  );
}
