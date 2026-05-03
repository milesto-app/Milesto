import { formatDateTime } from "@/lib/format";
import type { AdminUserDevice } from "@/lib/admin-api/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function UserDevicesPanel({ devices }: { devices: AdminUserDevice[] }) {
  if (devices.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card px-5 py-12 text-center text-sm text-muted-foreground">
        No registered devices
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs">Platform</TableHead>
            <TableHead className="text-xs">Environment</TableHead>
            <TableHead className="text-xs">Token</TableHead>
            <TableHead className="text-xs">Registered</TableHead>
            <TableHead className="text-xs">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devices.map((device) => (
            <TableRow key={device.id}>
              <TableCell className="text-sm font-medium">
                {device.platform}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {device.environment}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                ···{device.tokenLast4}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground tabular-nums">
                {formatDateTime(device.createdAt)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground tabular-nums">
                {formatDateTime(device.updatedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
