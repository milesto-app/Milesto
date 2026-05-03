"use client";

import {
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { Check, Pencil } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/admin-api/errors";

type Variant = "text" | "textarea" | "select" | "date";

export type InlineFieldProps = {
  label: string;
  value: string | null;
  variant?: Variant;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  multiline?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  format?: (value: string | null) => ReactNode;
  onSave: (next: string) => Promise<ActionResult<unknown>>;
  className?: string;
};

export function InlineField({
  label,
  value,
  variant = "text",
  options,
  placeholder = "—",
  disabled,
  ariaLabel,
  format,
  onSave,
  className,
}: InlineFieldProps) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [recentlySaved, setRecentlySaved] = useState(false);
  const inputRef = useRef<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
  >(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ("select" in inputRef.current) inputRef.current.select();
    }
  }, [editing]);

  function startEdit() {
    setDraft(value ?? "");
    setEditing(true);
  }

  function commit() {
    const next = draft.trim();
    if (next === (value ?? "")) {
      setEditing(false);
      return;
    }
    setPendingValue(next);
    setEditing(false);

    startTransition(async () => {
      const res = await onSave(next);
      if (res.ok) {
        setPendingValue(null);
        setRecentlySaved(true);
        window.setTimeout(() => setRecentlySaved(false), 600);
      } else {
        setPendingValue(null);
        setDraft(value ?? "");
        toast.error(res.error.message);
      }
    });
  }

  function cancel() {
    setEditing(false);
    setDraft(value ?? "");
  }

  const displayValue = pendingValue ?? value;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label
        htmlFor={id}
        className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary"
      >
        {label}
      </label>

      {editing ? (
        <div className="flex items-center gap-2">
          {variant === "select" && options ? (
            <select
              id={id}
              ref={(el) => {
                inputRef.current = el;
              }}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") cancel();
              }}
              className="w-full rounded-md border border-border-default bg-surface-1 px-2 py-1 text-sm text-text-primary outline-none focus:border-brand"
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : variant === "textarea" ? (
            <textarea
              id={id}
              ref={(el) => {
                inputRef.current = el;
              }}
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
                if (e.key === "Escape") cancel();
              }}
              className="w-full rounded-md border border-border-default bg-surface-1 px-2 py-1 text-sm text-text-primary outline-none focus:border-brand"
            />
          ) : (
            <input
              id={id}
              ref={(el) => {
                inputRef.current = el;
              }}
              type={variant === "date" ? "date" : "text"}
              value={draft}
              aria-label={ariaLabel ?? label}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") cancel();
              }}
              className="w-full rounded-md border border-border-default bg-surface-1 px-2 py-1 text-sm text-text-primary outline-none focus:border-brand"
            />
          )}
          <Pip pending={isPending} success={false} />
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={startEdit}
          className="group inline-flex items-center justify-between rounded-md px-1 py-0.5 text-left text-sm text-text-primary hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="truncate">
            {format ? format(displayValue) : (displayValue ?? placeholder)}
          </span>
          <span className="flex items-center gap-1.5">
            <Pip pending={isPending} success={recentlySaved} />
            <Pencil
              className="size-3 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
          </span>
        </button>
      )}
    </div>
  );
}

function Pip({ pending, success }: { pending: boolean; success: boolean }) {
  if (!pending && !success) {
    return (
      <span className="size-1.5 rounded-full bg-transparent" aria-hidden />
    );
  }
  if (pending) {
    return (
      <span
        className="size-1.5 animate-pulse rounded-full bg-brand"
        aria-hidden
      />
    );
  }
  return <Check className="size-3 text-status-success" aria-hidden />;
}
