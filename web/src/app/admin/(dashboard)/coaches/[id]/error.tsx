"use client";

import { RouteError } from "@/components/admin/route-error";

export default function CoachDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError resourceLabel="coach" error={error} reset={reset} />;
}
