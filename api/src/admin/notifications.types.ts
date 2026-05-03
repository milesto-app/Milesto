export interface AdminNotificationSend {
  id: string;
  userId: string;
  title: string;
  body: string;
  sentAt: string;
}

export interface AdminNotificationSendList {
  sends: AdminNotificationSend[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface AdminNotificationDevice {
  id: string;
  userId: string;
  platform: string;
  environment: string;
  tokenLast4: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNotificationDeviceList {
  devices: AdminNotificationDevice[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface AdminBroadcastResult {
  queued: boolean;
  recipientCount: number;
}

export type AdminBroadcastSegment = "all" | "pro" | "free";
