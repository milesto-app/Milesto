import { listAdmins } from "@/lib/admin-api/resources/meta";
import type { AdminListEntry } from "@/lib/admin-api/types";
import { Button } from "@/components/ui/button";
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

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function name(entry: AdminListEntry): string {
  const value = [entry.firstName, entry.lastName].filter(Boolean).join(" ");
  return value || "—";
}

export default async function AdminsPage() {
  const data = await listAdmins();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Admins"
        description="Operators with the admin role. Promote and demote actions ship in Phase 4."
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
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      disabled
                      title="Available in Phase 4"
                    >
                      Demote
                    </Button>
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
