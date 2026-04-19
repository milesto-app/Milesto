import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { config } from "../../config/app.config.js";
import type { Database } from "../../supabase/database.types.js";
import { SupabaseService } from "../../supabase/supabase.service.js";
import { CopyGenConsumerService } from "./copy-gen.consumer.js";
import { CopyGenService } from "./copy-gen.service.js";

type NotificationJobRow =
  Database["public"]["Tables"]["notification_jobs"]["Row"];

function buildJobRow(
  overrides: Partial<NotificationJobRow> = {},
): NotificationJobRow {
  return {
    attempts: 0,
    claimed_at: null,
    claimed_by: null,
    copy_attempts: 1,
    copy_claimed_at: "2026-04-20T11:59:00.000Z",
    copy_claimed_by: "copy-gen-consumer-test",
    copy_generation_id: null,
    copy_input_hash: "cafe".repeat(16),
    copy_status: "generating",
    created_at: "2026-04-20T11:00:00.000Z",
    dedup_key: "daily_check_in:user-1:2026-04-20",
    experiment_id: null,
    id: "job-1",
    kind: "daily_check_in",
    last_error: null,
    local_date: "2026-04-20",
    payload: {
      title: "Your coach",
      teaser: "Ready for today's plan?",
      coach: { id: 1, persona: "motivateur" },
      kind_specific: { target_local_hour: 9 },
      memory_hooks: {},
      copy_gen_context: { language: "en", suppress_streak_copy: false },
    },
    scheduled_for_utc: "2026-04-20T12:00:00.000Z",
    sent_at: null,
    sequence_id: null,
    sequence_step: null,
    skip_reason: null,
    status: "pending",
    tier: 2,
    user_id: "user-1",
    variant: null,
    ...overrides,
  };
}

interface MockSupabase {
  rpcMock: jest.Mock;
  insertedGenerations: Record<string, unknown>[];
  updatedJobs: { id: string; patch: Record<string, unknown> }[];
  insertedAlerts: Record<string, unknown>[];
  backlogCount: number;
  generationInsertResult: "ok" | "error";
}

function buildSupabaseStub(init: {
  claimedJobs?: NotificationJobRow[];
  backlogCount?: number;
  generationInsertResult?: "ok" | "error";
}): { service: SupabaseService; state: MockSupabase } {
  const state: MockSupabase = {
    rpcMock: jest.fn(),
    insertedGenerations: [],
    updatedJobs: [],
    insertedAlerts: [],
    backlogCount: init.backlogCount ?? 0,
    generationInsertResult: init.generationInsertResult ?? "ok",
  };

  state.rpcMock.mockImplementation(
    async (name: string): Promise<{ data: unknown; error: null }> => {
      if (name === "claim_notification_copy") {
        return Promise.resolve({ data: init.claimedJobs ?? [], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  );

  const generationsTable = {
    insert: (
      row: Record<string, unknown>,
    ): {
      select: () => {
        single: () => Promise<{
          data: { id: string } | null;
          error: { message: string } | null;
        }>;
      };
    } => ({
      select: () => ({
        single: async (): Promise<{
          data: { id: string } | null;
          error: { message: string } | null;
        }> => {
          if (state.generationInsertResult === "error") {
            return Promise.resolve({
              data: null,
              error: { message: "forced failure" },
            });
          }
          state.insertedGenerations.push(row);
          return Promise.resolve({
            data: { id: `gen-${String(state.insertedGenerations.length)}` },
            error: null,
          });
        },
      }),
    }),
  };

  const jobsTable = {
    select: (): {
      eq: () => {
        lt: () => Promise<{ count: number; error: null }>;
      };
    } => ({
      eq: () => ({
        lt: async (): Promise<{ count: number; error: null }> =>
          Promise.resolve({ count: state.backlogCount, error: null }),
      }),
    }),
    update: (
      patch: Record<string, unknown>,
    ): {
      eq: (col: string, id: string) => Promise<{ error: null }>;
    } => ({
      eq: async (_col: string, id: string): Promise<{ error: null }> => {
        state.updatedJobs.push({ id, patch });
        return Promise.resolve({ error: null });
      },
    }),
  };

  const alertsTable = {
    insert: async (row: Record<string, unknown>): Promise<{ error: null }> => {
      state.insertedAlerts.push(row);
      return Promise.resolve({ error: null });
    },
  };

  const from = (
    table: string,
  ): typeof generationsTable | typeof jobsTable | typeof alertsTable => {
    if (table === "notification_copy_generations") {
      return generationsTable;
    }
    if (table === "notification_jobs") {
      return jobsTable;
    }
    if (table === "notification_system_alerts") {
      return alertsTable;
    }
    throw new Error(`Unexpected supabase.from(${table}) in consumer spec`);
  };

  const service = {
    getAdminClient: () => ({ rpc: state.rpcMock, from }),
  } as unknown as SupabaseService;

  return { service, state };
}

describe("CopyGenConsumerService", () => {
  const saved = {
    globalEnabled: config.copyGen.globalEnabled,
    backlogThreshold: config.copyGen.consumerBacklogAlertThreshold,
  };

  let copyGenService: { generate: jest.Mock };

  afterEach(() => {
    config.copyGen.globalEnabled = saved.globalEnabled;
    config.copyGen.consumerBacklogAlertThreshold = saved.backlogThreshold;
  });

  beforeEach(() => {
    copyGenService = { generate: jest.fn() };
  });

  async function buildConsumer(
    supabaseService: SupabaseService,
  ): Promise<CopyGenConsumerService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CopyGenConsumerService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: CopyGenService, useValue: copyGenService },
      ],
    }).compile();
    return module.get(CopyGenConsumerService);
  }

  it("should no-op when COPY_GEN_GLOBAL_ENABLED=false (consumer never claims)", async () => {
    config.copyGen.globalEnabled = false;
    const { service, state } = buildSupabaseStub({ claimedJobs: [] });
    const consumer = await buildConsumer(service);

    await consumer.drain();

    expect(state.rpcMock).not.toHaveBeenCalled();
    expect(copyGenService.generate).not.toHaveBeenCalled();
  });

  it("should generate + persist for each claimed job (happy path)", async () => {
    config.copyGen.globalEnabled = true;
    const job = buildJobRow();
    const { service, state } = buildSupabaseStub({ claimedJobs: [job] });
    copyGenService.generate.mockResolvedValue({
      status: "generated",
      output: { title: "Hey you!", body: "Time to crush today." },
      promptVersion: "v1",
      personality: "motivateur",
      model: "openai/gpt-5.4-nano",
      providerStatus: 200,
      latencyMs: 850,
      attemptsUsed: 1,
    });
    const consumer = await buildConsumer(service);

    await consumer.drain();

    expect(copyGenService.generate).toHaveBeenCalledTimes(1);
    expect(state.insertedGenerations).toHaveLength(1);
    expect(state.insertedGenerations[0]).toEqual(
      expect.objectContaining({
        job_id: "job-1",
        kind: "daily_check_in",
        language: "en",
        status: "generated",
        input_hash: job.copy_input_hash,
      }),
    );
    expect(state.updatedJobs).toHaveLength(1);
    expect(state.updatedJobs[0]?.patch).toEqual(
      expect.objectContaining({
        copy_status: "generated",
        copy_generation_id: "gen-1",
      }),
    );
  });

  it("should stamp copy_status='failed' when the generator returns failed", async () => {
    config.copyGen.globalEnabled = true;
    const { service, state } = buildSupabaseStub({
      claimedJobs: [buildJobRow()],
    });
    copyGenService.generate.mockResolvedValue({
      status: "failed",
      errorCode: "banned_phrase",
      promptVersion: "v1",
      personality: "motivateur",
      model: "openai/gpt-5.4-nano",
      providerStatus: 200,
      latencyMs: 120,
      attemptsUsed: 2,
    });
    const consumer = await buildConsumer(service);

    await consumer.drain();

    expect(state.updatedJobs[0]?.patch).toEqual(
      expect.objectContaining({ copy_status: "failed" }),
    );
  });

  it("should raise a backlog alert when pending-due count exceeds the threshold", async () => {
    config.copyGen.globalEnabled = true;
    config.copyGen.consumerBacklogAlertThreshold = 50;
    const { service, state } = buildSupabaseStub({
      claimedJobs: [],
      backlogCount: 60,
    });
    const consumer = await buildConsumer(service);

    await consumer.drain();

    expect(state.insertedAlerts).toHaveLength(1);
    expect(state.insertedAlerts[0]?.["kind"]).toBe("copy_gen_backlog");
  });

  it("should not raise a backlog alert when pending-due count is under the threshold", async () => {
    config.copyGen.globalEnabled = true;
    config.copyGen.consumerBacklogAlertThreshold = 50;
    const { service, state } = buildSupabaseStub({
      claimedJobs: [],
      backlogCount: 40,
    });
    const consumer = await buildConsumer(service);

    await consumer.drain();

    expect(state.insertedAlerts).toHaveLength(0);
  });

  it("should mark the job failed synthetically when payload is missing copy_gen_context", async () => {
    config.copyGen.globalEnabled = true;
    const brokenJob = buildJobRow({
      payload: { title: "t", teaser: "b", kind_specific: {}, memory_hooks: {} },
    });
    const { service, state } = buildSupabaseStub({
      claimedJobs: [brokenJob],
    });
    const consumer = await buildConsumer(service);

    await consumer.drain();

    expect(copyGenService.generate).not.toHaveBeenCalled();
    expect(state.updatedJobs[0]?.patch).toEqual(
      expect.objectContaining({ copy_status: "failed" }),
    );
  });
});
