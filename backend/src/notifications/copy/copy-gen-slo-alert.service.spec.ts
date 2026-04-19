import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { SupabaseService } from "../../supabase/supabase.service.js";
import { CopyGenSloAlertService } from "./copy-gen-slo-alert.service.js";

interface SloRow {
  total: number | null;
  ai_generated: number | null;
  ai_share: number | null;
}

interface ViewResult {
  data: SloRow | null;
  error: { message: string } | null;
}

interface ServiceStub {
  service: SupabaseService;
  insertedAlerts: Record<string, unknown>[];
  setViewResult: (result: ViewResult) => void;
}

function buildSupabaseStub(initial: ViewResult): ServiceStub {
  const insertedAlerts: Record<string, unknown>[] = [];
  let viewResult: ViewResult = initial;

  const buildView = (): {
    select: () => {
      limit: () => {
        maybeSingle: () => Promise<ViewResult>;
      };
    };
  } => ({
    select: () => ({
      limit: () => ({
        maybeSingle: async (): Promise<ViewResult> =>
          Promise.resolve(viewResult),
      }),
    }),
  });

  const alertsTable = {
    insert: async (row: Record<string, unknown>): Promise<{ error: null }> => {
      insertedAlerts.push(row);
      return Promise.resolve({ error: null });
    },
  };

  const from = (table: string): unknown => {
    if (table === "v_copy_gen_slo_24h") {
      return buildView();
    }
    if (table === "notification_system_alerts") {
      return alertsTable;
    }
    throw new Error(`Unexpected supabase.from(${table}) in SLO-alert spec`);
  };

  const service = {
    getAdminClient: () => ({ from }),
  } as unknown as SupabaseService;

  return {
    service,
    insertedAlerts,
    setViewResult: (next): void => {
      viewResult = next;
    },
  };
}

describe("CopyGenSloAlertService", () => {
  async function build(
    supabaseService: SupabaseService,
  ): Promise<CopyGenSloAlertService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CopyGenSloAlertService,
        { provide: SupabaseService, useValue: supabaseService },
      ],
    }).compile();
    return module.get(CopyGenSloAlertService);
  }

  it("should not alert on a single breach window", async () => {
    const stub = buildSupabaseStub({
      data: { total: 100, ai_generated: 60, ai_share: 0.6 },
      error: null,
    });
    const svc = await build(stub.service);

    await svc.tick();

    expect(stub.insertedAlerts).toHaveLength(0);
  });

  it("should alert after two consecutive breach windows", async () => {
    const stub = buildSupabaseStub({
      data: { total: 100, ai_generated: 60, ai_share: 0.6 },
      error: null,
    });
    const svc = await build(stub.service);

    await svc.tick();
    await svc.tick();

    expect(stub.insertedAlerts).toHaveLength(1);
    expect(stub.insertedAlerts[0]?.["kind"]).toBe("copy_gen_slo_breach");
    const payload = stub.insertedAlerts[0]?.["payload"] as Record<
      string,
      unknown
    >;
    expect(payload["ai_share"]).toBe(0.6);
    expect(payload["threshold"]).toBe(0.75);
    expect(payload["total"]).toBe(100);
  });

  it("should reset the breach streak after alerting (no alert-spam)", async () => {
    const stub = buildSupabaseStub({
      data: { total: 100, ai_generated: 60, ai_share: 0.6 },
      error: null,
    });
    const svc = await build(stub.service);

    await svc.tick();
    await svc.tick();
    await svc.tick();

    expect(stub.insertedAlerts).toHaveLength(1);
  });

  it("should clear the breach streak when share recovers above threshold", async () => {
    const stub = buildSupabaseStub({
      data: { total: 100, ai_generated: 60, ai_share: 0.6 },
      error: null,
    });
    const svc = await build(stub.service);

    await svc.tick();
    stub.setViewResult({
      data: { total: 100, ai_generated: 80, ai_share: 0.8 },
      error: null,
    });
    await svc.tick();
    stub.setViewResult({
      data: { total: 100, ai_generated: 60, ai_share: 0.6 },
      error: null,
    });
    await svc.tick();

    expect(stub.insertedAlerts).toHaveLength(0);
  });

  it("should skip windows with zero deliveries", async () => {
    const stub = buildSupabaseStub({
      data: { total: 0, ai_generated: 0, ai_share: 0 },
      error: null,
    });
    const svc = await build(stub.service);

    await svc.tick();
    await svc.tick();

    expect(stub.insertedAlerts).toHaveLength(0);
  });

  it("should alert at exactly 0.749 share with 2 consecutive windows", async () => {
    const stub = buildSupabaseStub({
      data: { total: 1000, ai_generated: 749, ai_share: 0.749 },
      error: null,
    });
    const svc = await build(stub.service);

    await svc.tick();
    await svc.tick();

    expect(stub.insertedAlerts).toHaveLength(1);
  });

  it("should not alert when share is exactly at threshold", async () => {
    const stub = buildSupabaseStub({
      data: { total: 1000, ai_generated: 750, ai_share: 0.75 },
      error: null,
    });
    const svc = await build(stub.service);

    await svc.tick();
    await svc.tick();

    expect(stub.insertedAlerts).toHaveLength(0);
  });

  it("should swallow read errors without throwing", async () => {
    const stub = buildSupabaseStub({
      data: null,
      error: { message: "db down" },
    });
    const svc = await build(stub.service);

    await expect(svc.tick()).resolves.toBeUndefined();
    expect(stub.insertedAlerts).toHaveLength(0);
  });
});
