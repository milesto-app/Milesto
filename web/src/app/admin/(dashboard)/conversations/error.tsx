"use client";

import { RouteError } from "@/components/admin/route-error";

export default function ConversationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError resourceLabel="conversations" error={error} reset={reset} />
  );
}
