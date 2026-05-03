"use client";

import { RouteError } from "@/components/admin/route-error";

export default function GoalsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError resourceLabel="goals" error={error} reset={reset} />;
}
