"use client";

import { useMemo, useState } from "react";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { AdminBroadcastSegment } from "@/lib/admin-api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDestructiveDialog } from "@/components/admin/confirm-destructive-dialog";

import { broadcastAction } from "../actions";

const SEGMENTS: {
  value: AdminBroadcastSegment;
  label: string;
  hint: string;
}[] = [
  {
    value: "all",
    label: "All users",
    hint: "Everyone with a registered device",
  },
  { value: "pro", label: "Pro", hint: "Active paid subscribers only" },
  {
    value: "free",
    label: "Free",
    hint: "Users without an active subscription",
  },
];

const TITLE_LIMIT = 50;
const BODY_LIMIT = 150;

export function BroadcastComposer({
  distribution,
}: {
  distribution: Record<string, number>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState<AdminBroadcastSegment>("all");

  const audienceEstimate = useMemo(() => {
    const total = Object.values(distribution).reduce((sum, n) => sum + n, 0);
    if (segment === "all") return total;
    if (segment === "pro") return distribution["active"] ?? 0;
    if (segment === "free") {
      const active = distribution["active"] ?? 0;
      return Math.max(total - active, 0);
    }
    return total;
  }, [distribution, segment]);

  const valid =
    title.trim().length > 0 &&
    title.length <= TITLE_LIMIT &&
    body.trim().length > 0 &&
    body.length <= BODY_LIMIT;

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4 rounded-xl border border-border/50 bg-card p-5">
        <Field label="Title" hint={`${title.length}/${TITLE_LIMIT}`}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_LIMIT}
            placeholder="Time for a check-in"
          />
        </Field>
        <Field label="Body" hint={`${body.length}/${BODY_LIMIT}`}>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={BODY_LIMIT}
            rows={4}
            placeholder="Quick reminder — your weekly plan is ready."
          />
        </Field>
        <Field label="Segment">
          <div className="grid gap-2 sm:grid-cols-3">
            {SEGMENTS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSegment(opt.value)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  segment === opt.value
                    ? "border-primary/60 bg-primary/5"
                    : "border-border/60 hover:border-border",
                )}
              >
                <p className="font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.hint}</p>
              </button>
            ))}
          </div>
        </Field>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Estimated audience
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
            {audienceEstimate.toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Estimate based on current subscription distribution. Actual delivery
            depends on registered devices.
          </p>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Preview
          </p>
          <div className="mt-3 rounded-lg border border-border/40 bg-muted/40 p-3">
            <p className="text-sm font-semibold text-foreground">
              {title || "Title goes here"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {body || "Body text appears here."}
            </p>
          </div>
        </div>

        <ConfirmDestructiveDialog
          trigger={
            <Button
              type="button"
              disabled={!valid}
              className="w-full"
              size="sm"
            >
              <Megaphone className="h-3.5 w-3.5" />
              Send broadcast
            </Button>
          }
          title="Send broadcast"
          description={
            <>
              You&apos;re about to push <strong>{title || "(no title)"}</strong>{" "}
              to <strong>~{audienceEstimate.toLocaleString()}</strong> recipient
              {audienceEstimate === 1 ? "" : "s"} in the{" "}
              <strong>{segment}</strong> segment. This cannot be undone.
            </>
          }
          confirmString="BROADCAST"
          confirmLabel="Send broadcast"
          successMessage="Broadcast queued"
          onConfirm={async () => {
            const result = await broadcastAction({
              title: title.trim(),
              body: body.trim(),
              segment,
            });
            if (result.ok) {
              toast.message(
                `Queued for ${result.data.recipientCount.toLocaleString()} recipient${
                  result.data.recipientCount === 1 ? "" : "s"
                }`,
              );
              setTitle("");
              setBody("");
            }
            return result;
          }}
        />
      </aside>
    </div>
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
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {hint ? (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>
      {children}
    </label>
  );
}
