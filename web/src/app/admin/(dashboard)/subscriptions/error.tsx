"use client";

import { RouteError } from "@/components/admin/route-error";

export default function SubscriptionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError resourceLabel="subscriptions" error={error} reset={reset} />
  );
}
