import { Status } from "@apple/app-store-server-library";

export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  GRACE_PERIOD: "grace_period",
  BILLING_RETRY: "billing_retry",
  EXPIRED: "expired",
  REVOKED: "revoked",
  UNKNOWN: "unknown",
} as const;

export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export const PRO_SUBSCRIPTION_STATUSES = [
  SUBSCRIPTION_STATUS.ACTIVE,
  SUBSCRIPTION_STATUS.GRACE_PERIOD,
] as const;

export type ProSubscriptionStatus = (typeof PRO_SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_SOURCE = {
  APPLE: "apple",
  OVERRIDE: "override",
  NONE: "none",
} as const;

export type SubscriptionSource =
  (typeof SUBSCRIPTION_SOURCE)[keyof typeof SUBSCRIPTION_SOURCE];

export function isProSubscriptionStatus(
  status: string | null | undefined,
): status is ProSubscriptionStatus {
  return (PRO_SUBSCRIPTION_STATUSES as readonly string[]).includes(
    status ?? "",
  );
}

export function appleStatusToSubscriptionStatus(
  status: Status | number | undefined,
): SubscriptionStatus {
  if (status === Status.ACTIVE) {
    return SUBSCRIPTION_STATUS.ACTIVE;
  }
  if (status === Status.BILLING_GRACE_PERIOD) {
    return SUBSCRIPTION_STATUS.GRACE_PERIOD;
  }
  if (status === Status.BILLING_RETRY) {
    return SUBSCRIPTION_STATUS.BILLING_RETRY;
  }
  if (status === Status.EXPIRED) {
    return SUBSCRIPTION_STATUS.EXPIRED;
  }
  if (status === Status.REVOKED) {
    return SUBSCRIPTION_STATUS.REVOKED;
  }
  return SUBSCRIPTION_STATUS.UNKNOWN;
}

export function isEffectiveProStatus(
  status: string | null | undefined,
  expiresAt: string | null | undefined,
): boolean {
  return (
    isProSubscriptionStatus(status) &&
    expiresAt !== null &&
    expiresAt !== undefined &&
    new Date(expiresAt) > new Date()
  );
}
