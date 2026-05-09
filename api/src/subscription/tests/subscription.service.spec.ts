/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import {
  Environment,
  InAppOwnershipType,
  Status,
  Type,
  VerificationException,
  VerificationStatus,
} from "@apple/app-store-server-library";
import { UnauthorizedException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import {
  FakeSupabaseService,
  injectFakeVerifiers,
  makeFakeAppStoreApi,
  makeLastTransactionsItem,
  makeRenewalInfo,
  makeStatusResponse,
  makeTransaction,
  OTHER_USER_UUID,
  resetVerifiers,
  setVerifier,
  TEST_BUNDLE_ID,
  TEST_ORIGINAL_TX,
  TEST_PRODUCT_ID,
  TEST_USER_UUID,
} from "./fakes.js";

process.env.NODE_ENV = "test";
process.env.APPLE_ENVIRONMENT = "Production";
process.env.APPLE_BUNDLE_ID = TEST_BUNDLE_ID;
process.env.APPLE_APP_APPLE_ID = "1234567890";

mock.module("../apple-root-certs.js", () => ({
  loadAppleRootCertificates: () => [],
}));

const { SubscriptionService } = await import("../subscription.service.js");

interface Harness {
  service: InstanceType<typeof SubscriptionService>;
  supabase: FakeSupabaseService;
  appStoreApi: ReturnType<typeof makeFakeAppStoreApi>;
}

function buildHarness(
  options: {
    appStoreImpl?: (
      origTx: string,
      env: Environment,
    ) => Promise<ReturnType<typeof makeStatusResponse>>;
    sandboxFallback?: boolean;
  } = {},
): Harness {
  const supabase = new FakeSupabaseService();
  const appStoreApi = makeFakeAppStoreApi(options.appStoreImpl);
  const service = new SubscriptionService(supabase as any, appStoreApi as any);
  injectFakeVerifiers(service, {
    sandboxFallback: options.sandboxFallback ?? true,
  });
  return { service, supabase, appStoreApi };
}

describe("SubscriptionService.syncWithTransaction", () => {
  beforeEach(() => {
    resetVerifiers();
  });

  afterEach(() => {
    resetVerifiers();
  });

  it("falls back to the sandbox verifier when primary returns INVALID_ENVIRONMENT", async () => {
    const sandboxTransaction = makeTransaction({
      environment: Environment.SANDBOX,
    });
    const sandboxRenewal = makeRenewalInfo({
      environment: Environment.SANDBOX,
    });

    setVerifier(Environment.PRODUCTION, {
      transaction: () => {
        throw new VerificationException(VerificationStatus.INVALID_ENVIRONMENT);
      },
      renewalInfo: () => {
        throw new VerificationException(VerificationStatus.INVALID_ENVIRONMENT);
      },
    });
    setVerifier(Environment.SANDBOX, {
      transaction: async () => sandboxTransaction,
      renewalInfo: async () => sandboxRenewal,
    });

    const { service, supabase, appStoreApi } = buildHarness({
      appStoreImpl: async () =>
        makeStatusResponse({
          environment: Environment.SANDBOX,
          data: [
            {
              subscriptionGroupIdentifier: "group-1",
              lastTransactions: [
                makeLastTransactionsItem({ status: Status.ACTIVE }),
              ],
            },
          ],
        }),
    });

    await service.syncWithTransaction(TEST_USER_UUID, "tx-jws");

    expect(appStoreApi.getSubscriptionStatuses).toHaveBeenCalledWith(
      TEST_ORIGINAL_TX,
      Environment.SANDBOX,
    );
    const upserts = supabase.store.callsFor(
      "apple_subscription_accounts",
      "upsert",
    );
    expect(upserts).toHaveLength(1);
    const payload = upserts[0]?.payload as Record<string, unknown>;
    expect(payload.environment).toBe(Environment.SANDBOX);
    expect(payload.user_id).toBe(TEST_USER_UUID);
    expect(payload.original_transaction_id).toBe(TEST_ORIGINAL_TX);
    expect(payload.product_id).toBe(TEST_PRODUCT_ID);
  });

  it("does not retry the sandbox verifier on non-INVALID_ENVIRONMENT errors", async () => {
    const sandboxTxn = mock(async () => makeTransaction());
    setVerifier(Environment.PRODUCTION, {
      transaction: () => {
        throw new VerificationException(VerificationStatus.INVALID_CERTIFICATE);
      },
    });
    setVerifier(Environment.SANDBOX, { transaction: sandboxTxn });

    const { service, supabase } = buildHarness();

    await expect(
      service.syncWithTransaction(TEST_USER_UUID, "tx-jws"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sandboxTxn).not.toHaveBeenCalled();
    expect(
      supabase.store.callsFor("apple_subscription_accounts", "upsert"),
    ).toHaveLength(0);
  });

  it("surfaces INVALID_ENVIRONMENT as Unauthorized when no sandbox fallback exists", async () => {
    setVerifier(Environment.PRODUCTION, {
      transaction: () => {
        throw new VerificationException(VerificationStatus.INVALID_ENVIRONMENT);
      },
    });

    const { service, supabase } = buildHarness({ sandboxFallback: false });

    await expect(
      service.syncWithTransaction(TEST_USER_UUID, "tx-jws"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(
      supabase.store.callsFor("apple_subscription_accounts", "upsert"),
    ).toHaveLength(0);
  });

  it("rejects transactions whose bundleId does not match config", async () => {
    setVerifier(Environment.PRODUCTION, {
      transaction: async () => makeTransaction({ bundleId: "com.evil.app" }),
    });

    const { service, supabase } = buildHarness();

    await expect(
      service.syncWithTransaction(TEST_USER_UUID, "tx-jws"),
    ).rejects.toThrow(/bundle/i);
    expect(supabase.store.calls).toHaveLength(0);
  });

  it("rejects transactions with an unknown productId", async () => {
    setVerifier(Environment.PRODUCTION, {
      transaction: async () => makeTransaction({ productId: "not_a_real_sku" }),
    });

    const { service, supabase } = buildHarness();

    await expect(
      service.syncWithTransaction(TEST_USER_UUID, "tx-jws"),
    ).rejects.toThrow(/product/i);
    expect(supabase.store.calls).toHaveLength(0);
  });

  it("rejects family-shared subscriptions", async () => {
    setVerifier(Environment.PRODUCTION, {
      transaction: async () =>
        makeTransaction({
          inAppOwnershipType: InAppOwnershipType.FAMILY_SHARED,
        }),
    });

    const { service, supabase } = buildHarness();

    await expect(
      service.syncWithTransaction(TEST_USER_UUID, "tx-jws"),
    ).rejects.toThrow(/family-shared/i);
    expect(supabase.store.calls).toHaveLength(0);
  });

  it("rejects transactions whose Type is not auto-renewable", async () => {
    setVerifier(Environment.PRODUCTION, {
      transaction: async () => makeTransaction({ type: Type.CONSUMABLE }),
    });

    const { service, supabase } = buildHarness();

    await expect(
      service.syncWithTransaction(TEST_USER_UUID, "tx-jws"),
    ).rejects.toThrow(/product type/i);
    expect(supabase.store.calls).toHaveLength(0);
  });

  it("binds subscription to caller when no row exists and appAccountToken belongs to a different user", async () => {
    setVerifier(Environment.PRODUCTION, {
      transaction: async () =>
        makeTransaction({ appAccountToken: OTHER_USER_UUID }),
      renewalInfo: async () => makeRenewalInfo(),
    });

    const { service, supabase } = buildHarness({
      appStoreImpl: async () =>
        makeStatusResponse({
          data: [
            {
              subscriptionGroupIdentifier: "group-1",
              lastTransactions: [
                makeLastTransactionsItem({ status: Status.ACTIVE }),
              ],
            },
          ],
        }),
    });

    await service.syncWithTransaction(TEST_USER_UUID, "tx-jws");

    const upserts = supabase.store.callsFor(
      "apple_subscription_accounts",
      "upsert",
    );
    expect(upserts).toHaveLength(1);
    const payload = upserts[0]?.payload as Record<string, unknown>;
    expect(payload.user_id).toBe(TEST_USER_UUID);
    expect(payload.original_transaction_id).toBe(TEST_ORIGINAL_TX);
    expect(payload.environment).toBe(Environment.PRODUCTION);
  });

  it("binds subscription to caller when appAccountToken is undefined and no row exists", async () => {
    setVerifier(Environment.PRODUCTION, {
      transaction: async () => makeTransaction({ appAccountToken: undefined }),
      renewalInfo: async () => makeRenewalInfo(),
    });

    const { service, supabase } = buildHarness({
      appStoreImpl: async () =>
        makeStatusResponse({
          data: [
            {
              subscriptionGroupIdentifier: "group-1",
              lastTransactions: [
                makeLastTransactionsItem({ status: Status.ACTIVE }),
              ],
            },
          ],
        }),
    });

    await service.syncWithTransaction(TEST_USER_UUID, "tx-jws");

    const upserts = supabase.store.callsFor(
      "apple_subscription_accounts",
      "upsert",
    );
    expect(upserts).toHaveLength(1);
    const payload = upserts[0]?.payload as Record<string, unknown>;
    expect(payload.user_id).toBe(TEST_USER_UUID);
  });

  it("rejects when an existing row binds the subscription to a different user", async () => {
    setVerifier(Environment.PRODUCTION, {
      transaction: async () => makeTransaction(),
    });

    const { service, supabase } = buildHarness();
    supabase.store.seed("apple_subscription_accounts", [
      {
        environment: Environment.PRODUCTION,
        original_transaction_id: TEST_ORIGINAL_TX,
        user_id: OTHER_USER_UUID,
      },
    ]);

    await expect(
      service.syncWithTransaction(TEST_USER_UUID, "tx-jws"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(
      supabase.store.callsFor("apple_subscription_accounts", "upsert"),
    ).toHaveLength(0);
  });

  it("is idempotent when an existing row already binds to the caller", async () => {
    setVerifier(Environment.PRODUCTION, {
      transaction: async () => makeTransaction(),
      renewalInfo: async () => makeRenewalInfo(),
    });

    const { service, supabase } = buildHarness({
      appStoreImpl: async () =>
        makeStatusResponse({
          data: [
            {
              subscriptionGroupIdentifier: "group-1",
              lastTransactions: [
                makeLastTransactionsItem({ status: Status.ACTIVE }),
              ],
            },
          ],
        }),
    });
    supabase.store.seed("apple_subscription_accounts", [
      {
        environment: Environment.PRODUCTION,
        original_transaction_id: TEST_ORIGINAL_TX,
        user_id: TEST_USER_UUID,
      },
    ]);

    await service.syncWithTransaction(TEST_USER_UUID, "tx-jws");

    const upserts = supabase.store.callsFor(
      "apple_subscription_accounts",
      "upsert",
    );
    expect(upserts).toHaveLength(1);
    const payload = upserts[0]?.payload as Record<string, unknown>;
    expect(payload.user_id).toBe(TEST_USER_UUID);
  });
});
