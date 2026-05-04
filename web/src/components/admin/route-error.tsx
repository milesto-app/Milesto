"use client";

import { useEffect } from "react";
import { AlertOctagon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/admin/copy-button";

export function RouteError({
  resourceLabel,
  error,
  reset,
}: {
  resourceLabel: string;
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(`[admin] failed to load ${resourceLabel}`, error);
  }, [error, resourceLabel]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 px-6 py-16 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertOctagon className="size-5" aria-hidden />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-text-primary">
          Couldn&apos;t load {resourceLabel}
        </h3>
        <p className="text-sm text-text-secondary">
          {error.message || "An unexpected error occurred."}
        </p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => reset()}
        >
          Retry
        </Button>
        {error.digest ? (
          <CopyButton value={error.digest} label={`Error ${error.digest}`} />
        ) : null}
      </div>
    </div>
  );
}
