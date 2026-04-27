import type { JWSRenewalInfoDecodedPayload } from "@apple/app-store-server-library/dist/models/JWSRenewalInfoDecodedPayload.js";
import type { JWSTransactionDecodedPayload } from "@apple/app-store-server-library/dist/models/JWSTransactionDecodedPayload.js";
import type { ResponseBodyV2DecodedPayload } from "@apple/app-store-server-library/dist/models/ResponseBodyV2DecodedPayload.js";

import {
  deriveSubscriptionUpdate,
  SUBSCRIPTION_STATUS,
} from "./subscription-state.js";

const APPLE_AUTO_RENEW_ON = 1;
const APPLE_AUTO_RENEW_OFF = 0;

function buildNotification(
  notificationType: string,
  subtype?: string,
): ResponseBodyV2DecodedPayload {
  return {
    notificationType,
    subtype,
    notificationUUID: "uuid-test",
  };
}

function buildTransaction(): JWSTransactionDecodedPayload {
  return {
    transactionId: "tx-1",
    originalTransactionId: "orig-1",
    productId: "milesto_monthly",
    bundleId: "app.milesto-ai.auth.mobile",
  };
}

function buildRenewalInfo(
  autoRenewStatus?: number,
): JWSRenewalInfoDecodedPayload {
  return { autoRenewStatus } as JWSRenewalInfoDecodedPayload;
}

describe("deriveSubscriptionUpdate", () => {
  it("should map SUBSCRIBED to active status when initial buy", () => {
    const result = deriveSubscriptionUpdate(
      buildNotification("SUBSCRIBED", "INITIAL_BUY"),
      buildTransaction(),
      null,
    );
    expect(result?.status).toBe(SUBSCRIPTION_STATUS.ACTIVE);
  });

  it("should map DID_RENEW to active status", () => {
    const result = deriveSubscriptionUpdate(
      buildNotification("DID_RENEW"),
      buildTransaction(),
      null,
    );
    expect(result?.status).toBe(SUBSCRIPTION_STATUS.ACTIVE);
  });

  it("should map DID_RENEW BILLING_RECOVERY to active status", () => {
    const result = deriveSubscriptionUpdate(
      buildNotification("DID_RENEW", "BILLING_RECOVERY"),
      buildTransaction(),
      null,
    );
    expect(result?.status).toBe(SUBSCRIPTION_STATUS.ACTIVE);
  });

  it("should map DID_FAIL_TO_RENEW GRACE_PERIOD to grace_period", () => {
    const result = deriveSubscriptionUpdate(
      buildNotification("DID_FAIL_TO_RENEW", "GRACE_PERIOD"),
      buildTransaction(),
      null,
    );
    expect(result?.status).toBe(SUBSCRIPTION_STATUS.GRACE_PERIOD);
  });

  it("should map DID_FAIL_TO_RENEW without subtype to billing_retry", () => {
    const result = deriveSubscriptionUpdate(
      buildNotification("DID_FAIL_TO_RENEW"),
      buildTransaction(),
      null,
    );
    expect(result?.status).toBe(SUBSCRIPTION_STATUS.BILLING_RETRY);
  });

  it("should map GRACE_PERIOD_EXPIRED to expired", () => {
    const result = deriveSubscriptionUpdate(
      buildNotification("GRACE_PERIOD_EXPIRED"),
      buildTransaction(),
      null,
    );
    expect(result?.status).toBe(SUBSCRIPTION_STATUS.EXPIRED);
  });

  it("should map EXPIRED to expired", () => {
    const result = deriveSubscriptionUpdate(
      buildNotification("EXPIRED"),
      buildTransaction(),
      null,
    );
    expect(result?.status).toBe(SUBSCRIPTION_STATUS.EXPIRED);
  });

  it("should map REVOKE to revoked", () => {
    const result = deriveSubscriptionUpdate(
      buildNotification("REVOKE"),
      buildTransaction(),
      null,
    );
    expect(result?.status).toBe(SUBSCRIPTION_STATUS.REVOKED);
  });

  it("should map REFUND to revoked", () => {
    const result = deriveSubscriptionUpdate(
      buildNotification("REFUND"),
      buildTransaction(),
      null,
    );
    expect(result?.status).toBe(SUBSCRIPTION_STATUS.REVOKED);
  });

  it("should map DID_CHANGE_RENEWAL_STATUS AUTO_RENEW_DISABLED to autoRenew false and no status change", () => {
    const result = deriveSubscriptionUpdate(
      buildNotification("DID_CHANGE_RENEWAL_STATUS", "AUTO_RENEW_DISABLED"),
      buildTransaction(),
      null,
    );
    expect(result?.status).toBeUndefined();
    expect(result?.autoRenewStatus).toBe(false);
  });

  it("should map DID_CHANGE_RENEWAL_STATUS AUTO_RENEW_ENABLED to autoRenew true and no status change", () => {
    const result = deriveSubscriptionUpdate(
      buildNotification("DID_CHANGE_RENEWAL_STATUS", "AUTO_RENEW_ENABLED"),
      buildTransaction(),
      null,
    );
    expect(result?.status).toBeUndefined();
    expect(result?.autoRenewStatus).toBe(true);
  });

  it("should map DID_CHANGE_RENEWAL_PREF to no status change", () => {
    const result = deriveSubscriptionUpdate(
      buildNotification("DID_CHANGE_RENEWAL_PREF"),
      buildTransaction(),
      null,
    );
    expect(result?.status).toBeUndefined();
  });

  it("should map PRICE_INCREASE to no status change", () => {
    const result = deriveSubscriptionUpdate(
      buildNotification("PRICE_INCREASE"),
      buildTransaction(),
      null,
    );
    expect(result?.status).toBeUndefined();
  });

  it("should map OFFER_REDEEMED to active", () => {
    const result = deriveSubscriptionUpdate(
      buildNotification("OFFER_REDEEMED"),
      buildTransaction(),
      null,
    );
    expect(result?.status).toBe(SUBSCRIPTION_STATUS.ACTIVE);
  });

  it("should return null for CONSUMPTION_REQUEST", () => {
    const result = deriveSubscriptionUpdate(
      buildNotification("CONSUMPTION_REQUEST"),
      buildTransaction(),
      null,
    );
    expect(result).toBeNull();
  });

  it("should return null for TEST notification", () => {
    const result = deriveSubscriptionUpdate(
      buildNotification("TEST"),
      buildTransaction(),
      null,
    );
    expect(result).toBeNull();
  });

  it("should set autoRenewStatus from renewalInfo on DID_RENEW when AutoRenew on", () => {
    const result = deriveSubscriptionUpdate(
      buildNotification("DID_RENEW"),
      buildTransaction(),
      buildRenewalInfo(APPLE_AUTO_RENEW_ON),
    );
    expect(result?.autoRenewStatus).toBe(true);
  });

  it("should set autoRenewStatus false from renewalInfo when AutoRenew off", () => {
    const result = deriveSubscriptionUpdate(
      buildNotification("DID_RENEW"),
      buildTransaction(),
      buildRenewalInfo(APPLE_AUTO_RENEW_OFF),
    );
    expect(result?.autoRenewStatus).toBe(false);
  });
});
