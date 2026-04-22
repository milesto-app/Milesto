import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { SupabaseService } from "../supabase/supabase.service.js";
import { NotificationCopyService } from "./notification-copy.service.js";
import { NotificationSchedulerService } from "./notification-scheduler.service.js";
import { NotificationSendsService } from "./notification-sends.service.js";
import { NotificationsService } from "./notifications.service.js";

interface CandidateRow {
  user_id: string;
  language: string;
  coach_id: number;
  timezone: string;
  local_hour: number;
  goal_id: string;
  goal_title: string;
  user_motivation_quote: string | null;
  weekly_objectives: string[] | null;
  weekly_task_total: number | null;
  weekly_task_completed: number | null;
  recent_completed_titles: string[] | null;
  next_task_title: string | null;
}

const MOTIVATEUR_COACH_ID = 1;
const UNKNOWN_COACH_ID = 999;

function makeCandidate(overrides: Partial<CandidateRow> = {}): CandidateRow {
  return {
    user_id: "user-1",
    language: "en",
    coach_id: MOTIVATEUR_COACH_ID,
    timezone: "Europe/Paris",
    local_hour: 10,
    goal_id: "goal-1",
    goal_title: "Ship Momentum v2",
    user_motivation_quote: "I want to prove I can ship something real.",
    weekly_objectives: ["Draft release notes", "Fix regression bugs"],
    weekly_task_total: 5,
    weekly_task_completed: 2,
    recent_completed_titles: ["Write onboarding copy"],
    next_task_title: "Draft the release notes",
    ...overrides,
  };
}

let service: NotificationSchedulerService;
let mockRpc: jest.Mock;
let mockSupabaseService: { getAdminClient: jest.Mock };
let mockNotificationsService: { sendToUser: jest.Mock };
let mockCopyService: { generate: jest.Mock };
let mockSendsService: { recordSend: jest.Mock };

beforeEach(async () => {
  mockRpc = jest.fn();
  mockSupabaseService = {
    getAdminClient: jest.fn().mockReturnValue({ rpc: mockRpc }),
  };
  mockNotificationsService = {
    sendToUser: jest.fn().mockResolvedValue(undefined),
  };
  mockCopyService = { generate: jest.fn() };
  mockSendsService = { recordSend: jest.fn().mockResolvedValue(undefined) };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      NotificationSchedulerService,
      { provide: SupabaseService, useValue: mockSupabaseService },
      { provide: NotificationsService, useValue: mockNotificationsService },
      { provide: NotificationCopyService, useValue: mockCopyService },
      { provide: NotificationSendsService, useValue: mockSendsService },
    ],
  }).compile();

  service = module.get<NotificationSchedulerService>(
    NotificationSchedulerService,
  );
});

describe("NotificationSchedulerService.tick", () => {
  it("should do nothing when the RPC returns no candidates", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    await service.tick();

    expect(mockCopyService.generate).not.toHaveBeenCalled();
    expect(mockNotificationsService.sendToUser).not.toHaveBeenCalled();
    expect(mockSendsService.recordSend).not.toHaveBeenCalled();
  });

  it("should send and log when copy is generated for a candidate", async () => {
    mockRpc.mockResolvedValue({ data: [makeCandidate()], error: null });
    mockCopyService.generate.mockResolvedValue({
      title: "Time to ship",
      body: "Draft those release notes now.",
    });

    await service.tick();

    expect(mockNotificationsService.sendToUser).toHaveBeenCalledWith(
      "user-1",
      "Time to ship",
      "Draft those release notes now.",
    );
    expect(mockSendsService.recordSend).toHaveBeenCalledWith(
      "user-1",
      "Time to ship",
      "Draft those release notes now.",
    );
  });

  it("should skip send and log when copy generation returns null", async () => {
    mockRpc.mockResolvedValue({ data: [makeCandidate()], error: null });
    mockCopyService.generate.mockResolvedValue(null);

    await service.tick();

    expect(mockNotificationsService.sendToUser).not.toHaveBeenCalled();
    expect(mockSendsService.recordSend).not.toHaveBeenCalled();
  });

  it("should skip candidates with an unknown coach_id", async () => {
    mockRpc.mockResolvedValue({
      data: [makeCandidate({ coach_id: UNKNOWN_COACH_ID })],
      error: null,
    });

    await service.tick();

    expect(mockCopyService.generate).not.toHaveBeenCalled();
    expect(mockNotificationsService.sendToUser).not.toHaveBeenCalled();
  });

  it("should not throw when the RPC returns an error", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "db unavailable" },
    });

    await expect(service.tick()).resolves.toBeUndefined();
    expect(mockCopyService.generate).not.toHaveBeenCalled();
  });

  it("should continue other candidates when one dispatch throws", async () => {
    const candidates = [
      makeCandidate({ user_id: "user-1" }),
      makeCandidate({ user_id: "user-2" }),
    ];
    mockRpc.mockResolvedValue({ data: candidates, error: null });
    mockCopyService.generate.mockResolvedValue({ title: "t", body: "b" });
    mockNotificationsService.sendToUser
      .mockRejectedValueOnce(new Error("apns hiccup"))
      .mockResolvedValueOnce(undefined);

    await expect(service.tick()).resolves.toBeUndefined();

    expect(mockNotificationsService.sendToUser).toHaveBeenCalledTimes(2);
    expect(mockSendsService.recordSend).toHaveBeenCalledTimes(1);
    expect(mockSendsService.recordSend).toHaveBeenCalledWith(
      "user-2",
      "t",
      "b",
    );
  });
});
