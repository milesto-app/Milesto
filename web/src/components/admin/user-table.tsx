import Link from "next/link";

import type { AdminUserSummary } from "@/lib/admin-api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function subscriptionBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-primary/10 text-primary border-0 font-medium">
          Pro
        </Badge>
      );
    case "expired":
      return (
        <Badge
          variant="destructive"
          className="border-0 font-medium bg-destructive/10 text-destructive"
        >
          Expired
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="font-medium">
          Free
        </Badge>
      );
  }
}

export function UserTable({
  users,
  currentPage,
  totalPages,
}: {
  users: AdminUserSummary[];
  currentPage?: number;
  totalPages?: number;
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Plan
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Coach
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Joined
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="group">
                  <TableCell>
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-sm font-medium text-foreground transition-colors group-hover:text-primary"
                    >
                      {user.email}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[user.firstName, user.lastName]
                      .filter(Boolean)
                      .join(" ") || "\u2014"}
                  </TableCell>
                  <TableCell>
                    {subscriptionBadge(user.subscriptionStatus)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">
                    {user.coachId ?? "\u2014"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages != null && totalPages > 1 && currentPage != null && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/admin/users?page=${currentPage - 1}`} />}
                className="h-8 text-xs"
              >
                Previous
              </Button>
            )}
            {currentPage < totalPages && (
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/admin/users?page=${currentPage + 1}`} />}
                className="h-8 text-xs"
              >
                Next
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
