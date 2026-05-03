"use client";

import { RouteError } from "@/components/admin/route-error";

export default function DevicesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError resourceLabel="devices" error={error} reset={reset} />;
}
