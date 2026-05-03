"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDestructiveDialog } from "@/components/admin/confirm-destructive-dialog";

import { demoteAdminAction } from "../actions";

export function DemoteAdminButton({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  return (
    <ConfirmDestructiveDialog
      trigger={
        <Button type="button" variant="outline" size="xs">
          <Trash2 className="h-3 w-3" />
          Demote
        </Button>
      }
      title="Demote admin"
      description={
        <>
          This removes the admin role from <strong>{email}</strong>. They will
          retain their account but lose access to the admin dashboard.
        </>
      }
      confirmString={email}
      confirmLabel="Demote"
      successMessage="Admin demoted"
      onConfirm={() => demoteAdminAction(userId)}
    />
  );
}
