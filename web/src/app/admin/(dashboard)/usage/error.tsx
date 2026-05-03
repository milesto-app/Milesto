"use client";

import { RouteError } from "@/components/admin/route-error";

export default function UsageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError resourceLabel="usage" error={error} reset={reset} />;
}
