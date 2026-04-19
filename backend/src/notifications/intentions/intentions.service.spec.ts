import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { SupabaseService } from "../../supabase/supabase.service.js";
import { IntentionsService } from "./intentions.service.js";

const USER_ID = "user-uuid";
const OTHER_USER_ID = "other-user-uuid";
const TASK_ID = "task-uuid";

interface ServiceMocks {
  weeklyTaskOwnerUserId: string | null;
  weeklyTaskOwnerError: { message: string } | null;
  upsertResult: { data: unknown; error: { message: string } | null };
  selectResult: { data: unknown; error: { message: string } | null };
  updateResult: { data: unknown; error: { message: string } | null };
  deleteError: { message: string } | null;
}

function buildMocks(overrides: Partial<ServiceMocks> = {}): ServiceMocks {
  return {
    weeklyTaskOwnerUserId: USER_ID,
    weeklyTaskOwnerError: null,
    upsertResult: {
      data: {
        task_id: TASK_ID,
        day_of_week: 2,
        local_hour: 20,
        location_label: "at home",
        captured_at: "2026-04-19T10:00:00Z",
      },
      error: null,
    },
    selectResult: {
      data: null,
      error: null,
    },
    updateResult: {
      data: {
        task_id: TASK_ID,
        day_of_week: 3,
        local_hour: 21,
        location_label: null,
        captured_at: "2026-04-19T10:00:00Z",
      },
      error: null,
    },
    deleteError: null,
    ...overrides,
  };
}

function createFromMock(mocks: ServiceMocks): {
  from: jest.Mock;
  insertedPayload: { current: Record<string, unknown> | null };
} {
  const insertedPayload: { current: Record<string, unknown> | null } = {
    current: null,
  };

  const weeklyTaskQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockImplementation(async () =>
      Promise.resolve({
        data:
          mocks.weeklyTaskOwnerUserId === null
            ? null
            : { user_id: mocks.weeklyTaskOwnerUserId },
        error: mocks.weeklyTaskOwnerError,
      }),
    ),
  };

  const buildIntentionQuery = (): unknown => {
    return {
      upsert: jest.fn((payload: Record<string, unknown>) => {
        insertedPayload.current = payload;
        return {
          select: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockImplementation(async () =>
              Promise.resolve(mocks.upsertResult),
            ),
        };
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockImplementation(async () => Promise.resolve(mocks.selectResult)),
      update: jest.fn().mockImplementation(() => ({
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockImplementation(async () => Promise.resolve(mocks.updateResult)),
      })),
      delete: jest.fn().mockImplementation(() => ({
        eq: jest
          .fn()
          .mockImplementation(async () =>
            Promise.resolve({ error: mocks.deleteError }),
          ),
      })),
    };
  };

  const from = jest.fn((table: string) => {
    if (table === "weekly_tasks") {
      return weeklyTaskQuery;
    }
    if (table === "weekly_task_intentions") {
      return buildIntentionQuery();
    }
    throw new Error(`unexpected table ${table}`);
  });

  return { from, insertedPayload };
}

describe("IntentionsService", () => {
  let service: IntentionsService;
  let mocks: ServiceMocks;
  let fromMock: jest.Mock;
  let rpcMock: jest.Mock;
  let insertedPayload: { current: Record<string, unknown> | null };

  async function boot(): Promise<void> {
    const built = createFromMock(mocks);
    fromMock = built.from;
    insertedPayload = built.insertedPayload;
    rpcMock = jest
      .fn()
      .mockImplementation(async () =>
        Promise.resolve({ data: 0, error: null }),
      );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntentionsService,
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: () => ({ from: fromMock, rpc: rpcMock }),
          },
        },
      ],
    }).compile();
    service = module.get<IntentionsService>(IntentionsService);
  }

  beforeEach(async () => {
    mocks = buildMocks();
    await boot();
  });

  it("upserts an intention with the submitted fields when the caller owns the task", async () => {
    await service.upsert(USER_ID, {
      task_id: TASK_ID,
      day_of_week: 2,
      local_hour: 20,
      location_label: "at home",
    });

    expect(insertedPayload.current).toEqual(
      expect.objectContaining({
        task_id: TASK_ID,
        day_of_week: 2,
        local_hour: 20,
        location_label: "at home",
      }),
    );
  });

  it("rejects upsert with ForbiddenException when the task belongs to another user", async () => {
    mocks = buildMocks({ weeklyTaskOwnerUserId: OTHER_USER_ID });
    await boot();

    await expect(
      service.upsert(USER_ID, {
        task_id: TASK_ID,
        day_of_week: 2,
        local_hour: 20,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects upsert with NotFoundException when the task does not exist", async () => {
    mocks = buildMocks({ weeklyTaskOwnerUserId: null });
    await boot();

    await expect(
      service.upsert(USER_ID, {
        task_id: TASK_ID,
        day_of_week: 2,
        local_hour: 20,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("updates an intention when the caller owns the task", async () => {
    const result = await service.update(USER_ID, TASK_ID, {
      day_of_week: 3,
      local_hour: 21,
    });

    expect(result).toEqual(
      expect.objectContaining({ day_of_week: 3, local_hour: 21 }),
    );
  });

  it("rejects update with ForbiddenException when the task belongs to another user", async () => {
    mocks = buildMocks({ weeklyTaskOwnerUserId: OTHER_USER_ID });
    await boot();

    await expect(
      service.update(USER_ID, TASK_ID, { local_hour: 21 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("raises NotFoundException when update finds no existing intention row", async () => {
    mocks = buildMocks({ updateResult: { data: null, error: null } });
    await boot();

    await expect(
      service.update(USER_ID, TASK_ID, { local_hour: 21 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("deletes an intention when the caller owns the task", async () => {
    await expect(service.delete(USER_ID, TASK_ID)).resolves.toBeUndefined();
  });

  it("rejects delete with ForbiddenException when the task belongs to another user", async () => {
    mocks = buildMocks({ weeklyTaskOwnerUserId: OTHER_USER_ID });
    await boot();

    await expect(service.delete(USER_ID, TASK_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("cancels pending implementation_intention jobs via the RPC after a successful upsert", async () => {
    await service.upsert(USER_ID, {
      task_id: TASK_ID,
      day_of_week: 2,
      local_hour: 20,
    });

    expect(rpcMock).toHaveBeenCalledWith("cancel_pending_intention_jobs", {
      p_task_id: TASK_ID,
      p_captured_at: "2026-04-19T10:00:00Z",
    });
  });

  it("cancels pending intention jobs with the updated captured_at after update", async () => {
    await service.update(USER_ID, TASK_ID, { local_hour: 21 });

    expect(rpcMock).toHaveBeenCalledWith("cancel_pending_intention_jobs", {
      p_task_id: TASK_ID,
      p_captured_at: "2026-04-19T10:00:00Z",
    });
  });

  it("calls the cancellation RPC with a fresh captured_at on delete", async () => {
    const before = Date.now();
    await service.delete(USER_ID, TASK_ID);
    const after = Date.now();

    expect(rpcMock).toHaveBeenCalledTimes(1);
    const [, args] = rpcMock.mock.calls[0] as [
      string,
      { p_task_id: string; p_captured_at: string },
    ];
    expect(args.p_task_id).toBe(TASK_ID);
    const ts = Date.parse(args.p_captured_at);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("logs a warning and does not throw when the cancellation RPC errors", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "rpc blew up" },
    });

    await expect(
      service.upsert(USER_ID, {
        task_id: TASK_ID,
        day_of_week: 2,
        local_hour: 20,
      }),
    ).resolves.toBeDefined();
  });
});
