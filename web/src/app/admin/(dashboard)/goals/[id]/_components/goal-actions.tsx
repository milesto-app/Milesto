"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Repeat, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDestructiveDialog } from "@/components/admin/confirm-destructive-dialog";

import {
  deleteGoalAction,
  reembedGoalAction,
  regenerateProfileAction,
  regenerateRoadmapAction,
} from "../actions";

export function GoalToolbar({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function run(
    label: string,
    action: () => Promise<{ ok: boolean; error?: { message: string } }>,
  ) {
    startTransition(() => {
      void action().then((result) => {
        if (result.ok) {
          toast.success(`${label} done`);
        } else {
          toast.error(result.error?.message ?? `${label} failed`);
        }
      });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          run("Profile regenerated", () => regenerateProfileAction(id))
        }
      >
        <Sparkles className="h-3.5 w-3.5" />
        Regenerate profile
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => run("Reembedded", () => reembedGoalAction(id))}
      >
        <Repeat className="h-3.5 w-3.5" />
        Reembed
      </Button>
      <ConfirmDestructiveDialog
        trigger={
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Regenerate roadmap
          </Button>
        }
        title="Regenerate roadmap"
        description={
          <>
            Regenerating the roadmap deletes existing milestones, weekly plans,
            tasks, and debriefs for this goal. The user will see a fresh roadmap
            on next sync.
          </>
        }
        confirmString="REGENERATE"
        confirmLabel="Regenerate"
        successMessage="Roadmap regenerated"
        onConfirm={() => regenerateRoadmapAction(id)}
      />
    </div>
  );
}

export function GoalDangerZone({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
      <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Hard-deletes this goal and every dependent row (intake, roadmap,
        debriefs, embeddings, conversations). The user cannot recover this data.
      </p>
      <div className="mt-3">
        <ConfirmDestructiveDialog
          trigger={
            <Button type="button" variant="destructive" size="sm">
              <Trash2 className="h-3.5 w-3.5" />
              Delete goal
            </Button>
          }
          title="Delete goal permanently"
          description={
            <>
              You are about to permanently delete{" "}
              <strong>&ldquo;{title}&rdquo;</strong> and all of its data. This
              cannot be undone.
            </>
          }
          confirmString={id}
          confirmLabel="Delete goal"
          successMessage="Goal deleted"
          onConfirm={() => deleteGoalAction(id)}
          onSuccess={() => router.push("/admin/goals")}
        />
      </div>
    </div>
  );
}
