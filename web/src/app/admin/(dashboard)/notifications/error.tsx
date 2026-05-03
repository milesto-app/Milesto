"use client";

import { RouteError } from "@/components/admin/route-error";

export default function NotificationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError resourceLabel="notifications" error={error} reset={reset} />
  );
}
