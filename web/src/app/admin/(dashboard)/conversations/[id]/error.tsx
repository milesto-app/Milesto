"use client";

import { RouteError } from "@/components/admin/route-error";

export default function ConversationDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError resourceLabel="conversation" error={error} reset={reset} />
  );
}
