import { formatDate } from "@/lib/format";
import { getMe, listAdmins } from "@/lib/admin-api/resources/meta";
import type { AdminListEntry } from "@/lib/admin-api/types";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";

import { DemoteAdminButton } from "./_components/demote-button";
import { PromoteAdminForm } from "./_components/promote-form";

function name(entry: AdminListEntry): string {
  const value = [entry.firstName, entry.lastName].filter(Boolean).join(" ");
  return value || "—";
}

export default async function AdminsPage() {
  const [data, me] = await Promise.all([listAdmins(), getMe()]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Admins"
        description="Operators with the admin role."
        actions={<PromoteAdminForm />}
      />
      {data.admins.length === 0 ? (
        <EmptyState title="No admins yet" />
      ) : (
        <Card className="border-border/60 shadow-none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.admins.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {name(entry)}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatDate(entry.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.id === me.id ? (
                      <span className="text-xs text-muted-foreground">You</span>
                    ) : (
                      <DemoteAdminButton
                        userId={entry.id}
                        email={entry.email}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
