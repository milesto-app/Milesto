export interface AdminSubscriptionSummary {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  productId: string | null;
  environment: string | null;
  autoRenewStatus: boolean | null;
  expiresAt: string | null;
  verifiedAt: string | null;
  appleSignedAt: string | null;
  originalTransactionId: string | null;
}

export interface AdminSubscriptionList {
  subscriptions: AdminSubscriptionSummary[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface AdminSubscriptionProductBreakdown {
  count: number;
  mrr: number;
  arr: number;
}

export interface AdminSubscriptionMrrArr {
  mrr: number;
  arr: number;
  byProduct: Record<string, AdminSubscriptionProductBreakdown>;
}

export interface AdminSubscriptionChurn {
  windowDays: number;
  churned: number;
  retained: number;
  churnRate: number;
}

export interface AdminSubscriptionEvent {
  notificationUuid: string;
  notificationType: string;
  subtype: string | null;
  receivedAt: string;
}

export interface AdminSubscriptionEventList {
  events: AdminSubscriptionEvent[];
}
