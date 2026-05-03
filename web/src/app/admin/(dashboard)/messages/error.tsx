"use client";

import { RouteError } from "@/components/admin/route-error";

export default function MessagesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError resourceLabel="messages stats" error={error} reset={reset} />
  );
}
