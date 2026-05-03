"use client";

import { RouteError } from "@/components/admin/route-error";

export default function GoalDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError resourceLabel="goal" error={error} reset={reset} />;
}
