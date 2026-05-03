"use client";

import { useQueryState } from "nuqs";

import { cn } from "@/lib/utils";

export type SegmentedOption = {
  value: string;
  label: string;
  count?: number;
};

export function SegmentedTabs({
  options,
  paramKey = "tab",
  defaultValue,
  className,
}: {
  options: SegmentedOption[];
  paramKey?: string;
  defaultValue?: string;
  className?: string;
}) {
  const fallback = defaultValue ?? options[0]?.value ?? "";
  const [active, setActive] = useQueryState(paramKey, {
    defaultValue: fallback,
    shallow: false,
  });

  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex gap-1 rounded-lg border border-border-default bg-surface-2 p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const isActive = active === opt.value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => setActive(opt.value)}
            className={cn(
              "rounded-md px-3 py-1 text-[12px] font-medium transition-colors",
              isActive
                ? "bg-brand-bg-soft text-text-brand"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            <span>{opt.label}</span>
            {opt.count != null ? (
              <span className="ml-1.5 font-mono text-[11px] text-text-tertiary">
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
