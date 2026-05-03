"use client";

import { RouteError } from "@/components/admin/route-error";

export default function SystemError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError resourceLabel="system status" error={error} reset={reset} />
  );
}
