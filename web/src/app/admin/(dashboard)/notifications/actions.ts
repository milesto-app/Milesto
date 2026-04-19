"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SendNotificationPayload = {
  title: string;
  body: string;
  userIds?: string[];
  data?: Record<string, string>;
};

export type SendNotificationResult =
  | { ok: true; queued: boolean; recipientCount: number }
  | { ok: false; status: number; message: string };

export async function sendNotification(
  payload: SendNotificationPayload,
): Promise<SendNotificationResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "admin") {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { ok: false, status: 401, message: "No active session" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(
      `${process.env.BACKEND_URL}/api/notifications/send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: "no-store",
      },
    );
    clearTimeout(timeout);

    const data = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: data.message ?? data.error ?? `Request failed (${res.status})`,
      };
    }

    return {
      ok: true,
      queued: Boolean(data.queued),
      recipientCount: Number(data.recipientCount ?? 0),
    };
  } catch {
    clearTimeout(timeout);
    return {
      ok: false,
      status: 502,
      message: "Failed to reach notification service",
    };
  }
}
