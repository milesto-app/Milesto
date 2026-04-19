import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { SupabaseService } from "../../supabase/supabase.service.js";
import { CopyGenOrphanRecoveryService } from "./copy-gen-orphan-recovery.service.js";

interface UpdateCall {
  patch: Record<string, unknown>;
  returned: { id: string }[];
}

function buildSupabaseStub(responses: {
  retryableIds?: string[];
  exhaustedIds?: string[];
}): { service: SupabaseService; updates: UpdateCall[] } {
  const updates: UpdateCall[] = [];
  const state = {
    retryableIds: responses.retryableIds ?? [],
    exhaustedIds: responses.exhaustedIds ?? [],
  };

  const buildChain = (patch: Record<string, unknown>): unknown => {
    const call: UpdateCall = { patch, returned: [] };
    const chain: Record<string, unknown> = {};
    const returnChain = (): unknown => chain;
    chain["eq"] = returnChain;
    chain["lt"] = returnChain;
    chain["gte"] = returnChain;
    chain["select"] = async (): Promise<{
      data: { id: string }[];
      error: null;
    }> => {
      const isRetryable = patch["copy_status"] === "pending";
      const rows = isRetryable
        ? state.retryableIds.map((id) => ({ id }))
        : state.exhaustedIds.map((id) => ({ id }));
      call.returned = rows;
      updates.push(call);
      return Promise.resolve({ data: rows, error: null });
    };
    return chain;
  };

  const from = (
    table: string,
  ): { update: (patch: Record<string, unknown>) => unknown } => {
    if (table !== "notification_jobs") {
      throw new Error(`Unexpected table ${table}`);
    }
    return { update: buildChain };
  };

  const service = {
    getAdminClient: () => ({ from }),
  } as unknown as SupabaseService;

  return { service, updates };
}

describe("CopyGenOrphanRecoveryService", () => {
  async function buildService(
    supabaseService: SupabaseService,
  ): Promise<CopyGenOrphanRecoveryService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CopyGenOrphanRecoveryService,
        { provide: SupabaseService, useValue: supabaseService },
      ],
    }).compile();
    return module.get(CopyGenOrphanRecoveryService);
  }

  it("resets retryable 'generating' claims back to 'pending'", async () => {
    const { service, updates } = buildSupabaseStub({
      retryableIds: ["job-a"],
      exhaustedIds: [],
    });
    const svc = await buildService(service);

    await svc.recover();

    const retryableUpdate = updates.find(
      (u) => u.patch["copy_status"] === "pending",
    );
    expect(retryableUpdate).toBeDefined();
    expect(retryableUpdate?.patch).toEqual(
      expect.objectContaining({
        copy_status: "pending",
        copy_claimed_at: null,
        copy_claimed_by: null,
      }),
    );
  });

  it("flips jobs with copy_attempts >= max to 'failed'", async () => {
    const { service, updates } = buildSupabaseStub({
      retryableIds: [],
      exhaustedIds: ["job-b"],
    });
    const svc = await buildService(service);

    await svc.recover();

    const failedUpdate = updates.find(
      (u) => u.patch["copy_status"] === "failed",
    );
    expect(failedUpdate).toBeDefined();
    expect(failedUpdate?.returned).toEqual([{ id: "job-b" }]);
  });

  it("runs both retryable-reset and exhausted-fail paths in parallel", async () => {
    const { service, updates } = buildSupabaseStub({
      retryableIds: ["job-a"],
      exhaustedIds: ["job-b"],
    });
    const svc = await buildService(service);

    await svc.recover();

    expect(updates).toHaveLength(2);
  });
});
