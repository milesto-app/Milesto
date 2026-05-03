"use client";

import { RouteError } from "@/components/admin/route-error";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError resourceLabel="account" error={error} reset={reset} />;
}
