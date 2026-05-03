"use client";

import {
  useId,
  useState,
  useTransition,
  type ReactElement,
  type ReactNode,
} from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/admin-api/errors";
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

export type ConfirmDestructiveDialogProps = {
  trigger: ReactElement;
  title: string;
  description: ReactNode;
  confirmString: string;
  confirmLabel?: string;
  successMessage?: string;
  onConfirm: () => Promise<ActionResult<unknown>>;
  onSuccess?: () => void;
};

export function ConfirmDestructiveDialog({
  trigger,
  title,
  description,
  confirmString,
  confirmLabel = "Delete",
  successMessage,
  onConfirm,
  onSuccess,
}: ConfirmDestructiveDialogProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputId = useId();

  const matches = input.trim() === confirmString;

  function handleOpenChange(next: boolean) {
    if (isPending) return;
    setOpen(next);
    if (!next) setInput("");
  }

  function handleSubmit() {
    if (!matches || isPending) return;
    startTransition(() => {
      void onConfirm().then((result) => {
        if (result.ok) {
          toast.success(successMessage ?? "Done");
          setOpen(false);
          setInput("");
          onSuccess?.();
        } else {
          toast.error(result.error.message);
        }
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <DialogTitle className="text-destructive">{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          <label htmlFor={inputId} className="text-xs text-text-secondary">
            Type{" "}
            <code className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-text-primary">
              {confirmString}
            </code>{" "}
            to confirm.
          </label>
          <Input
            id={inputId}
            autoComplete="off"
            spellCheck={false}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches && !isPending) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={confirmString}
            className={cn(
              "font-mono text-sm",
              matches && "border-destructive/60",
            )}
          />
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!matches || isPending}
          >
            {isPending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
