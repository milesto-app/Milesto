import type { JWSRenewalInfoDecodedPayload } from '@apple/app-store-server-library/dist/models/JWSRenewalInfoDecodedPayload.js';
import type { JWSTransactionDecodedPayload } from '@apple/app-store-server-library/dist/models/JWSTransactionDecodedPayload.js';
import type { ResponseBodyV2DecodedPayload } from '@apple/app-store-server-library/dist/models/ResponseBodyV2DecodedPayload.js';

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  GRACE_PERIOD: 'grace_period',
  BILLING_RETRY: 'billing_retry',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  UNKNOWN: 'unknown',
} as const;

export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export interface SubscriptionUpdate {
  status?: SubscriptionStatus;
  autoRenewStatus?: boolean | null;
  reason: string;
}

const NOTIFICATION_TYPE = {
  SUBSCRIBED: 'SUBSCRIBED',
  DID_RENEW: 'DID_RENEW',
  DID_FAIL_TO_RENEW: 'DID_FAIL_TO_RENEW',
  GRACE_PERIOD_EXPIRED: 'GRACE_PERIOD_EXPIRED',
  EXPIRED: 'EXPIRED',
  REVOKE: 'REVOKE',
  REFUND: 'REFUND',
  REFUND_DECLINED: 'REFUND_DECLINED',
  REFUND_REVERSED: 'REFUND_REVERSED',
  DID_CHANGE_RENEWAL_STATUS: 'DID_CHANGE_RENEWAL_STATUS',
  DID_CHANGE_RENEWAL_PREF: 'DID_CHANGE_RENEWAL_PREF',
  PRICE_INCREASE: 'PRICE_INCREASE',
  OFFER_REDEEMED: 'OFFER_REDEEMED',
  RENEWAL_EXTENDED: 'RENEWAL_EXTENDED',
} as const;

const SUBTYPE = {
  GRACE_PERIOD: 'GRACE_PERIOD',
  AUTO_RENEW_ENABLED: 'AUTO_RENEW_ENABLED',
  AUTO_RENEW_DISABLED: 'AUTO_RENEW_DISABLED',
  BILLING_RECOVERY: 'BILLING_RECOVERY',
} as const;

const APPLE_AUTO_RENEW_ON = 1;

const STATUS_ONLY_MAP: Record<string, SubscriptionStatus> = {
  [NOTIFICATION_TYPE.SUBSCRIBED]: SUBSCRIPTION_STATUS.ACTIVE,
  [NOTIFICATION_TYPE.DID_RENEW]: SUBSCRIPTION_STATUS.ACTIVE,
  [NOTIFICATION_TYPE.OFFER_REDEEMED]: SUBSCRIPTION_STATUS.ACTIVE,
  [NOTIFICATION_TYPE.RENEWAL_EXTENDED]: SUBSCRIPTION_STATUS.ACTIVE,
  [NOTIFICATION_TYPE.REFUND_REVERSED]: SUBSCRIPTION_STATUS.ACTIVE,
  [NOTIFICATION_TYPE.GRACE_PERIOD_EXPIRED]: SUBSCRIPTION_STATUS.EXPIRED,
  [NOTIFICATION_TYPE.EXPIRED]: SUBSCRIPTION_STATUS.EXPIRED,
  [NOTIFICATION_TYPE.REVOKE]: SUBSCRIPTION_STATUS.REVOKED,
  [NOTIFICATION_TYPE.REFUND]: SUBSCRIPTION_STATUS.REVOKED,
};

const AUTO_RENEW_ONLY_TYPES: readonly string[] = [
  NOTIFICATION_TYPE.DID_CHANGE_RENEWAL_PREF,
  NOTIFICATION_TYPE.PRICE_INCREASE,
  NOTIFICATION_TYPE.REFUND_DECLINED,
];

function autoRenewFromRenewalInfo(
  renewalInfo: JWSRenewalInfoDecodedPayload | null | undefined,
): boolean | null {
  if (renewalInfo === null || renewalInfo === undefined) {
    return null;
  }
  const raw = renewalInfo.autoRenewStatus;
  if (raw === undefined) {
    return null;
  }
  return raw === APPLE_AUTO_RENEW_ON;
}

function formatReason(type: string, subtype: string | undefined): string {
  return subtype === undefined || subtype === '' ? type : `${type}:${subtype}`;
}

function handleRenewalStatusChange(
  type: string,
  subtype: string | undefined,
  didDeriveAutoRenew: boolean | null,
): SubscriptionUpdate {
  if (subtype === SUBTYPE.AUTO_RENEW_DISABLED) {
    return { autoRenewStatus: false, reason: `${type}:${subtype}` };
  }
  if (subtype === SUBTYPE.AUTO_RENEW_ENABLED) {
    return { autoRenewStatus: true, reason: `${type}:${subtype}` };
  }
  return { autoRenewStatus: didDeriveAutoRenew, reason: type };
}

function handleDidFailToRenew(
  type: string,
  subtype: string | undefined,
  didDeriveAutoRenew: boolean | null,
): SubscriptionUpdate {
  const reason = formatReason(type, subtype);
  const status =
    subtype === SUBTYPE.GRACE_PERIOD
      ? SUBSCRIPTION_STATUS.GRACE_PERIOD
      : SUBSCRIPTION_STATUS.BILLING_RETRY;
  return { status, autoRenewStatus: didDeriveAutoRenew, reason };
}

export function deriveSubscriptionUpdate(
  notification: ResponseBodyV2DecodedPayload,
  _transaction: JWSTransactionDecodedPayload,
  renewalInfo: JWSRenewalInfoDecodedPayload | null | undefined,
): SubscriptionUpdate | null {
  const rawType = notification.notificationType;
  if (rawType === undefined) {
    return null;
  }
  const type: string = rawType;
  const subtype: string | undefined = notification.subtype;
  const didDeriveAutoRenew = autoRenewFromRenewalInfo(renewalInfo);
  const reason = formatReason(type, subtype);

  const mappedStatus = STATUS_ONLY_MAP[type];
  if (mappedStatus !== undefined) {
    return {
      status: mappedStatus,
      autoRenewStatus: didDeriveAutoRenew,
      reason,
    };
  }

  if (type === NOTIFICATION_TYPE.DID_FAIL_TO_RENEW) {
    return handleDidFailToRenew(type, subtype, didDeriveAutoRenew);
  }

  if (type === NOTIFICATION_TYPE.DID_CHANGE_RENEWAL_STATUS) {
    return handleRenewalStatusChange(type, subtype, didDeriveAutoRenew);
  }

  if (AUTO_RENEW_ONLY_TYPES.includes(type)) {
    return { autoRenewStatus: didDeriveAutoRenew, reason };
  }

  return null;
}
