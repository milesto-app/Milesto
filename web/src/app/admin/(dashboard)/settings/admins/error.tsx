"use client";

import { RouteError } from "@/components/admin/route-error";

export default function AdminsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError resourceLabel="admins" error={error} reset={reset} />;
}
