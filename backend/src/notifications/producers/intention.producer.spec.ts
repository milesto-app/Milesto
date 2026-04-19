import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { SupabaseService } from "../../supabase/supabase.service.js";
import { GateService } from "../gate/gate.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import {
  NOTIFICATION_KIND,
  NOTIFICATION_TIER,
} from "../outbox/outbox.types.js";
import { IntentionProducer } from "./intention.producer.js";

const USER_ID = "user-uuid";
const TASK_ID = "task-uuid";
const TIMEZONE = "Europe/Paris";

interface IntentionRow {
  task_id: string;
  day_of_week: number;
  local_hour: number;
  location_label: string | null;
  weekly_tasks: {
    title: string;
    user_id: string;
    is_completed: boolean;
    profiles: {
      timezone: string | null;
      language: string | null;
      coach_id: number | null;
      notif_enabled: boolean;
      notif_permission_status: string;
    } | null;
  } | null;
}

function buildRow(overrides: Partial<IntentionRow> = {}): IntentionRow {
  return {
    task_id: TASK_ID,
    day_of_week: 2,
    local_hour: 20,
    location_label: "at home",
    weekly_tasks: {
      title: "Run 5k",
      user_id: USER_ID,
      is_completed: false,
      profiles: {
        timezone: TIMEZONE,
        language: "en",
        coach_id: 1,
        notif_enabled: true,
        notif_permission_status: "granted",
      },
    },
    ...overrides,
  };
}

function createSupabaseMock(rows: IntentionRow[]): {
  from: jest.Mock;
} {
  const eq = jest
    .fn()
    .mockImplementation(async () =>
      Promise.resolve({ data: rows, error: null }),
    );
  const query = {
    select: jest.fn().mockReturnThis(),
    eq,
  };
  return {
    from: jest.fn(() => query),
  };
}

describe("IntentionProducer", () => {
  let producer: IntentionProducer;
  let outboxInsert: jest.Mock;
  let gateIsPushAllowed: jest.Mock;

  async function bootWith(rows: IntentionRow[]): Promise<void> {
    outboxInsert = jest
      .fn()
      .mockResolvedValue({ status: "inserted", jobId: "job-1" });
    gateIsPushAllowed = jest.fn().mockResolvedValue({
      allowed: true,
      timezone: TIMEZONE,
      quietStart: 22,
      quietEnd: 7,
    });
    const { from } = createSupabaseMock(rows);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntentionProducer,
        { provide: OutboxService, useValue: { insert: outboxInsert } },
        {
          provide: GateService,
          useValue: { isPushAllowed: gateIsPushAllowed },
        },
        {
          provide: SupabaseService,
          useValue: { getAdminClient: () => ({ from }) },
        },
      ],
    }).compile();
    producer = module.get<IntentionProducer>(IntentionProducer);
  }

  it("enqueues an implementation_intention job at the next captured weekday slot", async () => {
    await bootWith([buildRow()]);
    const now = new Date("2026-04-19T10:00:00.000Z");

    await producer.scheduleIntentions(now);

    expect(outboxInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        kind: NOTIFICATION_KIND.IMPLEMENTATION_INTENTION,
        tier: NOTIFICATION_TIER.P2,
      }),
    );
  });

  it("uses the task_id + local date in the dedup key", async () => {
    await bootWith([buildRow()]);
    const now = new Date("2026-04-19T10:00:00.000Z");

    await producer.scheduleIntentions(now);

    const call = outboxInsert.mock.calls[0] as [{ dedupKey: string }];
    expect(call[0].dedupKey).toMatch(
      /^implementation_intention:task-uuid:\d{4}-\d{2}-\d{2}$/,
    );
  });

  it("skips candidates whose underlying task is already completed (filtered at DB)", async () => {
    // The candidate query uses .eq("weekly_tasks.is_completed", false), so
    // completed-task rows never reach the producer; simulate by returning [].
    await bootWith([]);
    const now = new Date("2026-04-19T10:00:00.000Z");

    await producer.scheduleIntentions(now);

    expect(outboxInsert).not.toHaveBeenCalled();
  });

  it("skips candidates when the gate denies the push", async () => {
    await bootWith([buildRow()]);
    gateIsPushAllowed.mockResolvedValueOnce({
      allowed: false,
      reason: "kind_disabled",
      timezone: TIMEZONE,
      quietStart: 22,
      quietEnd: 7,
    });
    const now = new Date("2026-04-19T10:00:00.000Z");

    await producer.scheduleIntentions(now);

    expect(outboxInsert).not.toHaveBeenCalled();
  });

  it("records a duplicate insert without throwing when the same local date is rescheduled", async () => {
    await bootWith([buildRow()]);
    outboxInsert.mockResolvedValueOnce({ status: "duplicate" });
    const now = new Date("2026-04-19T10:00:00.000Z");

    await producer.scheduleIntentions(now);

    expect(outboxInsert).toHaveBeenCalledTimes(1);
  });

  it("builds an if-then teaser mentioning the captured day, hour, location, and task title", async () => {
    await bootWith([buildRow()]);
    const now = new Date("2026-04-19T10:00:00.000Z");

    await producer.scheduleIntentions(now);

    const call = outboxInsert.mock.calls[0] as [
      { payload: Record<string, unknown> },
    ];
    const teaser = call[0].payload["teaser"];
    expect(teaser).toBe("It's Tuesday 20h at home — Run 5k is waiting.");
  });

  it("populates kind_specific with task and intention details", async () => {
    await bootWith([buildRow()]);
    const now = new Date("2026-04-19T10:00:00.000Z");

    await producer.scheduleIntentions(now);

    const call = outboxInsert.mock.calls[0] as [
      { payload: Record<string, unknown> },
    ];
    expect(call[0].payload["kind_specific"]).toEqual({
      task_id: TASK_ID,
      task_title: "Run 5k",
      day_of_week: 2,
      local_hour: 20,
      location_label: "at home",
    });
  });

  it("sets cta_deeplink to momentum://task/<id>", async () => {
    await bootWith([buildRow()]);
    const now = new Date("2026-04-19T10:00:00.000Z");

    await producer.scheduleIntentions(now);

    const call = outboxInsert.mock.calls[0] as [
      { payload: Record<string, unknown> },
    ];
    expect(call[0].payload["cta_deeplink"]).toBe(`momentum://task/${TASK_ID}`);
  });

  it("uses the captured local hour regardless of any persona-default (override STO)", async () => {
    await bootWith([buildRow()]);
    const now = new Date("2026-04-19T10:00:00.000Z");

    await producer.scheduleIntentions(now);

    const call = outboxInsert.mock.calls[0] as [
      { payload: { kind_specific: { local_hour: number } } },
    ];
    expect(call[0].payload.kind_specific.local_hour).toBe(20);
  });
});
