"use client";

import { RouteError } from "@/components/admin/route-error";

export default function IntakeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError resourceLabel="intake" error={error} reset={reset} />;
}
