"use client";

import { RouteError } from "@/components/admin/route-error";

export default function CoachesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError resourceLabel="coaches" error={error} reset={reset} />;
}
