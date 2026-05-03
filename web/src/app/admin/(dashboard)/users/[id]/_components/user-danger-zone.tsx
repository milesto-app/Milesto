"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDestructiveDialog } from "@/components/admin/confirm-destructive-dialog";

import { deleteUserAction } from "../actions";

export function UserDangerZone({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const router = useRouter();
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
      <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Permanently soft-deletes this user (GDPR removal). Their goals,
        conversations, and devices become unreachable. This cannot be undone.
      </p>
      <div className="mt-3">
        <ConfirmDestructiveDialog
          trigger={
            <Button type="button" variant="destructive" size="sm">
              <Trash2 className="h-3.5 w-3.5" />
              Delete user
            </Button>
          }
          title="Delete user permanently"
          description={
            <>
              You are about to delete <strong>{email}</strong>. Type the email
              to confirm.
            </>
          }
          confirmString={email}
          confirmLabel="Delete user"
          successMessage="User deleted"
          onConfirm={() => deleteUserAction(userId)}
          onSuccess={() => router.push("/admin/users")}
        />
      </div>
    </div>
  );
}
