/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Environment } from "@apple/app-store-server-library";
import { BadRequestException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import {
  FakeSupabaseService,
  injectFakeVerifiers,
  makeFakeAppStoreApi,
  makeNotification,
  resetVerifiers,
  setVerifier,
  TEST_BUNDLE_ID,
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

function buildHarness(): Harness {
  const supabase = new FakeSupabaseService();
  const appStoreApi = makeFakeAppStoreApi();
  const service = new SubscriptionService(supabase as any, appStoreApi as any);
  injectFakeVerifiers(service);
  return { service, supabase, appStoreApi };
}

describe("SubscriptionService.handleWebhook", () => {
  beforeEach(() => {
    resetVerifiers();
  });

  afterEach(() => {
    resetVerifiers();
  });

  it("records TEST notifications as ignored without contacting Apple", async () => {
    setVerifier(Environment.PRODUCTION, {
      notification: async () =>
        makeNotification({
          notificationType: "TEST",
          notificationUUID: "uuid-test-1",
          data: undefined,
        }),
    });

    const { service, supabase, appStoreApi } = buildHarness();

    await service.handleWebhook("payload");

    const events = supabase.store.callsFor(
      "apple_subscription_events",
      "upsert",
    );
    expect(events).toHaveLength(1);
    const payload = events[0]?.payload as Record<string, unknown>;
    expect(payload.notification_uuid).toBe("uuid-test-1");
    expect(payload.notification_type).toBe("TEST");
    expect(payload.result).toBe("ignored");
    expect(appStoreApi.getSubscriptionStatuses).not.toHaveBeenCalled();
  });

  it("dedupes a previously-processed notificationUUID without re-running the handler", async () => {
    setVerifier(Environment.PRODUCTION, {
      notification: async () =>
        makeNotification({ notificationUUID: "uuid-replay" }),
    });

    const { service, supabase, appStoreApi } = buildHarness();
    supabase.store.seed("apple_subscription_events", [
      {
        notification_uuid: "uuid-replay",
        notification_type: "DID_RENEW",
        result: "processed",
      },
    ]);

    await service.handleWebhook("payload");

    expect(
      supabase.store.callsFor("apple_subscription_events", "upsert"),
    ).toHaveLength(0);
    expect(appStoreApi.getSubscriptionStatuses).not.toHaveBeenCalled();
  });

  it("retries notifications previously recorded as errors", async () => {
    setVerifier(Environment.PRODUCTION, {
      notification: async () =>
        makeNotification({
          notificationType: "TEST",
          notificationUUID: "uuid-retry",
          data: undefined,
        }),
    });

    const { service, supabase } = buildHarness();
    supabase.store.seed("apple_subscription_events", [
      {
        notification_uuid: "uuid-retry",
        notification_type: "DID_RENEW",
        result: "error",
      },
    ]);

    await service.handleWebhook("payload");

    const events = supabase.store.callsFor(
      "apple_subscription_events",
      "upsert",
    );
    expect(events).toHaveLength(1);
    const payload = events[0]?.payload as Record<string, unknown>;
    expect(payload.result).toBe("ignored");
  });

  it("rejects empty signedPayload with BadRequestException", async () => {
    const { service, supabase } = buildHarness();

    await expect(service.handleWebhook("")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(supabase.store.calls).toHaveLength(0);
  });

  it("rejects notifications missing notificationUUID with BadRequestException", async () => {
    setVerifier(Environment.PRODUCTION, {
      notification: async () =>
        makeNotification({ notificationUUID: undefined }),
    });

    const { service, supabase } = buildHarness();

    await expect(service.handleWebhook("payload")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(
      supabase.store.callsFor("apple_subscription_events", "upsert"),
    ).toHaveLength(0);
  });
});
