/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { Status } from "@apple/app-store-server-library";
import { describe, expect, it } from "bun:test";

import {
  appleStatusToSubscriptionStatus,
  isEffectiveProStatus,
  SUBSCRIPTION_STATUS,
} from "../subscription-state.js";

describe("subscription state mapping", () => {
  it("maps App Store Server API status codes", () => {
    expect(appleStatusToSubscriptionStatus(Status.ACTIVE)).toBe(
      SUBSCRIPTION_STATUS.ACTIVE,
    );
    expect(appleStatusToSubscriptionStatus(Status.BILLING_GRACE_PERIOD)).toBe(
      SUBSCRIPTION_STATUS.GRACE_PERIOD,
    );
    expect(appleStatusToSubscriptionStatus(Status.BILLING_RETRY)).toBe(
      SUBSCRIPTION_STATUS.BILLING_RETRY,
    );
    expect(appleStatusToSubscriptionStatus(Status.EXPIRED)).toBe(
      SUBSCRIPTION_STATUS.EXPIRED,
    );
    expect(appleStatusToSubscriptionStatus(Status.REVOKED)).toBe(
      SUBSCRIPTION_STATUS.REVOKED,
    );
  });

  it("returns UNKNOWN for undefined or unrecognised status codes", () => {
    expect(appleStatusToSubscriptionStatus(undefined)).toBe(
      SUBSCRIPTION_STATUS.UNKNOWN,
    );
    expect(appleStatusToSubscriptionStatus(999)).toBe(
      SUBSCRIPTION_STATUS.UNKNOWN,
    );
  });

  it("requires a future expiry for effective pro access", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const past = new Date(Date.now() - 60_000).toISOString();

    expect(isEffectiveProStatus(SUBSCRIPTION_STATUS.ACTIVE, future)).toBe(true);
    expect(isEffectiveProStatus(SUBSCRIPTION_STATUS.GRACE_PERIOD, future)).toBe(
      true,
    );
    expect(isEffectiveProStatus(SUBSCRIPTION_STATUS.ACTIVE, past)).toBe(false);
    expect(
      isEffectiveProStatus(SUBSCRIPTION_STATUS.BILLING_RETRY, future),
    ).toBe(false);
  });

  it("treats a null or undefined expiry as not effective", () => {
    expect(isEffectiveProStatus(SUBSCRIPTION_STATUS.ACTIVE, null)).toBe(false);
    expect(isEffectiveProStatus(SUBSCRIPTION_STATUS.ACTIVE, undefined)).toBe(
      false,
    );
    expect(isEffectiveProStatus(SUBSCRIPTION_STATUS.GRACE_PERIOD, null)).toBe(
      false,
    );
  });
});
