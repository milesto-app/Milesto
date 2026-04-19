import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import type { Database } from "../../supabase/database.types.js";
import { SupabaseService } from "../../supabase/supabase.service.js";
import { DeliveryTelemetryService } from "../deliveries/delivery-telemetry.service.js";
import { GateService } from "../gate/gate.service.js";
import { NotificationsService } from "../notifications.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import { NOTIFICATION_KIND } from "../outbox/outbox.types.js";
import { DispatcherService } from "./dispatcher.service.js";

type NotificationJobRow =
  Database["public"]["Tables"]["notification_jobs"]["Row"];

interface RecentSendsRow {
  send_count: number;
  earliest_sent_at: string | null;
}

interface RpcStubConfig {
  claimRows: NotificationJobRow[];
  predicateValid: boolean;
  acceptedDeliveries: boolean;
  recentSends: RecentSendsRow;
}

interface JobUpdateCapture {
  id: string;
  patch: Record<string, unknown>;
}

const MS_PER_HOUR = 3_600_000;
const NOW_ISO = "2026-04-20T12:00:00.000Z";
const NOW_MS = new Date(NOW_ISO).getTime();

function buildJob(
  overrides: Partial<NotificationJobRow> = {},
): NotificationJobRow {
  return {
    attempts: 1,
    claimed_at: null,
    claimed_by: null,
    created_at: NOW_ISO,
    dedup_key: "daily_check_in:user-1:2026-04-20",
    experiment_id: null,
    id: "job-1",
    kind: NOTIFICATION_KIND.MILESTONE_HIT,
    last_error: null,
    local_date: null,
    payload: { title: "t", teaser: "b" },
    scheduled_for_utc: NOW_ISO,
    sent_at: null,
    sequence_id: null,
    sequence_step: null,
    skip_reason: null,
    status: "claimed",
    tier: 0,
    user_id: "user-1",
    variant: null,
    ...overrides,
  };
}

describe("DispatcherService — global ceiling (M2.5)", () => {
  let service: DispatcherService;
  let outbox: {
    markSent: jest.Mock;
    markSkipped: jest.Mock;
    markFailed: jest.Mock;
    revertToPending: jest.Mock;
  };
  let gate: { isPushAllowed: jest.Mock };
  let notifications: { sendToUserWithReport: jest.Mock };
  let telemetry: { recordDispatchResults: jest.Mock };
  let rpcConfig: RpcStubConfig;
  let jobUpdates: JobUpdateCapture[];
  let supabase: SupabaseService;

  function buildSupabaseStub(): SupabaseService {
    const rpc = async (
      name: string,
      args: Record<string, unknown>,
    ): Promise<{
      data: unknown;
      error: null;
    }> => {
      if (name === "claim_notification_jobs") {
        return Promise.resolve({ data: rpcConfig.claimRows, error: null });
      }
      if (name === "recent_sends_window") {
        // Silence unused-var warning while asserting args shape.
        void args;
        return Promise.resolve({
          data: [rpcConfig.recentSends],
          error: null,
        });
      }
      if (name === "daily_check_in_predicate") {
        return Promise.resolve({
          data: rpcConfig.predicateValid,
          error: null,
        });
      }
      if (name === "milestone_preview_predicate") {
        return Promise.resolve({
          data: rpcConfig.predicateValid,
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    };

    const jobsTable = {
      update: (
        patch: Record<string, unknown>,
      ): {
        eq: (col: string, id: string) => Promise<{ error: null }>;
      } => ({
        eq: async (_col: string, id: string): Promise<{ error: null }> => {
          jobUpdates.push({ id, patch });
          return Promise.resolve({ error: null });
        },
      }),
      select: (): {
        eq: () => {
          maybeSingle: () => Promise<{
            data: { sent_at: string | null };
            error: null;
          }>;
        };
      } => ({
        eq: () => ({
          maybeSingle: async (): Promise<{
            data: { sent_at: string | null };
            error: null;
          }> => Promise.resolve({ data: { sent_at: null }, error: null }),
        }),
      }),
    };
    const deliveriesTable = {
      select: (): {
        eq: () => {
          eq: () => {
            limit: () => Promise<{
              data: { id: string }[];
              error: null;
            }>;
          };
        };
      } => ({
        eq: () => ({
          eq: () => ({
            limit: async (): Promise<{
              data: { id: string }[];
              error: null;
            }> =>
              Promise.resolve({
                data: rpcConfig.acceptedDeliveries
                  ? [{ id: "delivery-1" }]
                  : [],
                error: null,
              }),
          }),
        }),
      }),
    };

    const from = (table: string): typeof jobsTable | typeof deliveriesTable => {
      if (table === "notification_jobs") {
        return jobsTable;
      }
      if (table === "notification_deliveries") {
        return deliveriesTable;
      }
      throw new Error(`Unexpected supabase.from(${table}) in dispatcher spec`);
    };

    return {
      getAdminClient: () => ({ rpc, from }),
    } as unknown as SupabaseService;
  }

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date(NOW_ISO));
    jobUpdates = [];
    rpcConfig = {
      claimRows: [],
      predicateValid: true,
      acceptedDeliveries: false,
      recentSends: { send_count: 0, earliest_sent_at: null },
    };
    outbox = {
      markSent: jest.fn().mockResolvedValue(undefined),
      markSkipped: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
      revertToPending: jest.fn().mockResolvedValue(undefined),
    };
    gate = {
      isPushAllowed: jest.fn().mockResolvedValue({
        allowed: true,
        timezone: "Europe/Paris",
        quietStart: 22,
        quietEnd: 7,
      }),
    };
    notifications = {
      sendToUserWithReport: jest
        .fn()
        .mockResolvedValue([{ token: "tok", accepted: true, statusCode: 200 }]),
    };
    telemetry = {
      recordDispatchResults: jest.fn().mockResolvedValue(undefined),
    };
    supabase = buildSupabaseStub();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatcherService,
        { provide: SupabaseService, useValue: supabase },
        { provide: NotificationsService, useValue: notifications },
        { provide: OutboxService, useValue: outbox },
        { provide: DeliveryTelemetryService, useValue: telemetry },
        { provide: GateService, useValue: gate },
      ],
    }).compile();
    service = module.get(DispatcherService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should proceed to APNs send when no recent sends exist", async () => {
    rpcConfig.claimRows = [buildJob()];
    rpcConfig.recentSends = { send_count: 0, earliest_sent_at: null };

    await service.drain();

    expect(notifications.sendToUserWithReport).toHaveBeenCalledTimes(1);
    expect(outbox.markSent).toHaveBeenCalledWith("job-1");
    expect(outbox.markSkipped).not.toHaveBeenCalled();
  });

  it("should reschedule the job when 2 recent sends and next gap is <2h away", async () => {
    // Earliest send was 23h ago → next slot 1h in the future (<2h threshold).
    const earliestMs = NOW_MS - 23 * MS_PER_HOUR;
    rpcConfig.claimRows = [buildJob()];
    rpcConfig.recentSends = {
      send_count: 2,
      earliest_sent_at: new Date(earliestMs).toISOString(),
    };

    await service.drain();

    expect(notifications.sendToUserWithReport).not.toHaveBeenCalled();
    expect(outbox.markSkipped).not.toHaveBeenCalled();
    expect(jobUpdates).toHaveLength(1);
    const expectedSlot = new Date(earliestMs + 24 * MS_PER_HOUR).toISOString();
    expect(jobUpdates[0]).toEqual({
      id: "job-1",
      patch: {
        status: "pending",
        claimed_by: null,
        claimed_at: null,
        scheduled_for_utc: expectedSlot,
        attempts: 0,
      },
    });
  });

  it("should skip with global_ceiling when next gap is >2h away", async () => {
    // Earliest send was 10h ago → next slot 14h in future (>2h threshold).
    const earliestMs = NOW_MS - 10 * MS_PER_HOUR;
    rpcConfig.claimRows = [buildJob()];
    rpcConfig.recentSends = {
      send_count: 2,
      earliest_sent_at: new Date(earliestMs).toISOString(),
    };

    await service.drain();

    expect(notifications.sendToUserWithReport).not.toHaveBeenCalled();
    expect(outbox.markSkipped).toHaveBeenCalledWith("job-1", "global_ceiling");
    expect(jobUpdates).toHaveLength(0);
  });

  it("should reschedule (not skip) when the gap is exactly at the 2h boundary", async () => {
    // Earliest send was 22h ago → next slot exactly 2h in future (inclusive).
    const earliestMs = NOW_MS - 22 * MS_PER_HOUR;
    rpcConfig.claimRows = [buildJob()];
    rpcConfig.recentSends = {
      send_count: 2,
      earliest_sent_at: new Date(earliestMs).toISOString(),
    };

    await service.drain();

    expect(outbox.markSkipped).not.toHaveBeenCalled();
    expect(jobUpdates).toHaveLength(1);
    expect(jobUpdates[0]?.patch["scheduled_for_utc"]).toBe(
      new Date(earliestMs + 24 * MS_PER_HOUR).toISOString(),
    );
  });

  it("should still enforce the ceiling for celebration kinds (milestone_hit, goal_hit, week_completed, milestone_preview)", async () => {
    const earliestMs = NOW_MS - 10 * MS_PER_HOUR;
    rpcConfig.recentSends = {
      send_count: 2,
      earliest_sent_at: new Date(earliestMs).toISOString(),
    };
    const celebrationKinds: string[] = [
      NOTIFICATION_KIND.MILESTONE_HIT,
      NOTIFICATION_KIND.GOAL_HIT,
      NOTIFICATION_KIND.WEEK_COMPLETED,
      NOTIFICATION_KIND.MILESTONE_PREVIEW,
    ];

    for (const kind of celebrationKinds) {
      outbox.markSkipped.mockClear();
      notifications.sendToUserWithReport.mockClear();
      rpcConfig.claimRows = [buildJob({ id: `job-${kind}`, kind })];

      await service.drain();

      expect(notifications.sendToUserWithReport).not.toHaveBeenCalled();
      expect(outbox.markSkipped).toHaveBeenCalledWith(
        `job-${kind}`,
        "global_ceiling",
      );
    }
  });
});
