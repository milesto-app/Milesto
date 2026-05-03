"use server";

import { updateTag } from "next/cache";

import {
  NOTIFICATIONS_CACHE_TAG,
  broadcastNotification,
  type BroadcastBody,
} from "@/lib/admin-api/resources/notifications";
import {
  normalizeError,
  type ActionResult,
} from "@/lib/admin-api/errors";
import type { AdminBroadcastResult } from "@/lib/admin-api/types";

export async function broadcastAction(
  body: BroadcastBody,
): Promise<ActionResult<AdminBroadcastResult>> {
  try {
    const data = await broadcastNotification(body);
    updateTag(NOTIFICATIONS_CACHE_TAG);
    return { ok: true, data };
  } catch (error) {
    return normalizeError(error);
  }
}
