import "server-only";

import { apiFetch } from "@/lib/admin-api/client";
import type {
  AdminBroadcastResult,
  AdminBroadcastSegment,
  AdminNotificationDeviceList,
  AdminNotificationSendList,
  AdminSchedulerStatus,
} from "@/lib/admin-api/types";

const DEFAULT_REVALIDATE_SECONDS = 30;
const NOTIFICATIONS_TAG = "admin:notifications";

function next() {
  return { tags: [NOTIFICATIONS_TAG], revalidate: DEFAULT_REVALIDATE_SECONDS };
}

export type ListSendsParams = {
  page?: number;
  perPage?: number;
  days?: number;
  userId?: string;
};

export async function listSends(
  params: ListSendsParams = {},
): Promise<AdminNotificationSendList> {
  return apiFetch<AdminNotificationSendList>("/admin/notifications/sends", {
    next: next(),
    query: {
      page: params.page,
      perPage: params.perPage,
      days: params.days,
      userId: params.userId,
    },
  });
}

export type ListDevicesParams = {
  page?: number;
  perPage?: number;
  userId?: string;
};

export async function listDevices(
  params: ListDevicesParams = {},
): Promise<AdminNotificationDeviceList> {
  return apiFetch<AdminNotificationDeviceList>("/admin/notifications/devices", {
    next: next(),
    query: {
      page: params.page,
      perPage: params.perPage,
      userId: params.userId,
    },
  });
}

export async function getSchedulerStatus(): Promise<AdminSchedulerStatus> {
  return apiFetch<AdminSchedulerStatus>(
    "/admin/notifications/scheduler-status",
    { cache: "no-store" },
  );
}

export type BroadcastBody = {
  title: string;
  body: string;
  segment?: AdminBroadcastSegment;
  data?: Record<string, string>;
};

export async function broadcastNotification(
  body: BroadcastBody,
): Promise<AdminBroadcastResult> {
  return apiFetch<AdminBroadcastResult>("/admin/notifications/broadcast", {
    method: "POST",
    cache: "no-store",
    body,
  });
}

export const NOTIFICATIONS_CACHE_TAG = NOTIFICATIONS_TAG;
