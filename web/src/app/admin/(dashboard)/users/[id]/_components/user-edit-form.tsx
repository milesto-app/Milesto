"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import type { AdminUserDetail } from "@/lib/admin-api/types";
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

import { updateUserAction } from "../actions";

const ROLE_OPTIONS = ["user", "admin"] as const;
const COACH_OPTIONS = [1, 2, 3, 4] as const;

export function UserEditButton({ user }: { user: AdminUserDetail }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>(
    user.role === "admin" ? "admin" : "user",
  );
  const [language, setLanguage] = useState(user.language ?? "");
  const [coachId, setCoachId] = useState<string>(
    user.coachId == null ? "" : String(user.coachId),
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (isPending) return;
    const body: {
      role?: "user" | "admin";
      language?: string;
      coachId?: number;
    } = {};
    if (role !== user.role) body.role = role;
    if (language.trim() !== (user.language ?? "")) {
      body.language = language.trim();
    }
    const parsedCoach = coachId === "" ? null : Number.parseInt(coachId, 10);
    if (parsedCoach !== user.coachId && parsedCoach != null) {
      body.coachId = parsedCoach;
    }
    if (Object.keys(body).length === 0) {
      toast.message("No changes");
      setOpen(false);
      return;
    }
    startTransition(() => {
      void updateUserAction(user.id, body).then((result) => {
        if (result.ok) {
          toast.success("User updated");
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
          <Button type="button" variant="outline" size="sm">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update role, language, or assigned coach.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Field label="Role">
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as (typeof ROLE_OPTIONS)[number])
              }
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Language" hint="BCP-47 (e.g. en, fr-FR)">
            <Input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              maxLength={10}
            />
          </Field>
          <Field label="Coach">
            <select
              value={coachId}
              onChange={(e) => setCoachId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">— none —</option>
              {COACH_OPTIONS.map((id) => (
                <option key={id} value={id}>
                  Coach {id}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}
