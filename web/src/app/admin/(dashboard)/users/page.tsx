import { Search } from "lucide-react";

import { getUsers, searchUsers } from "@/lib/supabase/queries/users";
import { Input } from "@/components/ui/input";
import { UserTable } from "@/components/admin/user-table";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { page, search } = await searchParams;

  const pageNum = Math.max(1, typeof page === "string" ? parseInt(page, 10) || 1 : 1);
  const searchQuery = typeof search === "string" ? search : "";

  if (searchQuery) {
    const data = await searchUsers(searchQuery);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and view user accounts
          </p>
        </div>
        <form action="/admin/users" method="GET">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="search"
              type="search"
              placeholder="Search by email..."
              defaultValue={searchQuery}
              className="h-10 pl-9 bg-card border-border/50"
            />
          </div>
        </form>
        <UserTable users={data.users} />
      </div>
    );
  }

  const data = await getUsers(pageNum);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage and view user accounts
        </p>
      </div>

      <form action="/admin/users" method="GET">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            type="search"
            placeholder="Search by email..."
            className="h-10 pl-9 bg-card border-border/50"
          />
        </div>
      </form>

      <UserTable
        users={data.users}
        currentPage={data.currentPage}
        totalPages={data.totalPages}
      />
    </div>
  );
}
