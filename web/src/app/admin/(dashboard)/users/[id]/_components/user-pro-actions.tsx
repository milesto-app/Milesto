"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import {
  grantProAction,
  refreshSubscriptionAction,
  revokeProAction,
} from "../actions";

function defaultExpiry(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

export function GrantProButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(defaultExpiry());
  const [isPending, startTransition] = useTransition();

  const valid = !Number.isNaN(new Date(date).getTime());

  function handleSubmit() {
    if (!valid || isPending) return;
    const expiresAt = new Date(`${date}T23:59:59Z`).toISOString();
    startTransition(() => {
      void grantProAction(userId, expiresAt).then((result) => {
        if (result.ok) {
          toast.success("Pro granted");
          setOpen(false);
        } else {
          toast.error(result.error.message);
        }
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" size="sm" variant="default">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Grant Pro
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grant Pro subscription</DialogTitle>
          <DialogDescription>
            Manually mark this user as Pro until the chosen expiry.
          </DialogDescription>
        </DialogHeader>
        <label className="block space-y-1.5 py-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Expires on
          </span>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!valid || isPending}
          >
            {isPending ? "Granting…" : "Grant Pro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RevokeProButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();

  function handle() {
    if (isPending) return;
    startTransition(() => {
      void revokeProAction(userId).then((result) => {
        if (result.ok) toast.success("Pro revoked");
        else toast.error(result.error.message);
      });
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handle}
      disabled={isPending}
    >
      <XCircle className="h-3.5 w-3.5" />
      {isPending ? "Revoking…" : "Revoke Pro"}
    </Button>
  );
}

export function RefreshSubscriptionButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();

  function handle() {
    if (isPending) return;
    startTransition(() => {
      void refreshSubscriptionAction(userId).then((result) => {
        if (result.ok) {
          toast.success("Subscription refreshed");
        } else if (result.error.code === "http_501") {
          toast.message("Refresh endpoint not implemented yet (501)");
        } else {
          toast.error(result.error.message);
        }
      });
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={handle}
      disabled={isPending}
    >
      <RefreshCw className="h-3.5 w-3.5" />
      {isPending ? "Refreshing…" : "Refresh from Apple"}
    </Button>
  );
}
