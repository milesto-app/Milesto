import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

import { COACH_BY_ID } from "../coach/coaches.config.js";
import { config } from "../config/app.config.js";
import type { Json } from "../supabase/database.types.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import { NotificationCopyService } from "./notification-copy.service.js";
import type { TimeOfDay } from "./notification-prompts.js";
import { NotificationSendsService } from "./notification-sends.service.js";
import { NotificationsService } from "./notifications.service.js";

const AFTERNOON_START_HOUR = 12;
const EVENING_START_HOUR = 18;

interface Candidate {
  user_id: string;
  language: string;
  coach_id: number;
  timezone: string;
  local_hour: number;
  goal_id: string;
  goal_title: string;
  user_motivation_quote: string | null;
  weekly_objectives: Json | null;
  weekly_task_total: number | null;
  weekly_task_completed: number | null;
  recent_completed_titles: string[] | null;
  next_task_title: string | null;
}

export interface SchedulerStatus {
  isRunning: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastBatchSize: number;
}

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);
  private isRunning = false;
  private lastRunAt: Date | null = null;
  private lastBatchSize = 0;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationCopyService: NotificationCopyService,
    private readonly notificationSendsService: NotificationSendsService,
  ) {}

  @Cron(config.notifications.cronExpression)
  public async tick(): Promise<void> {
    this.isRunning = true;
    try {
      const candidates = await this.loadCandidates();
      this.lastBatchSize = candidates.length;
      this.lastRunAt = new Date();
      if (candidates.length === 0) {
        return;
      }
      this.logger.log(
        `Dispatching nudges to ${String(candidates.length)} candidates`,
      );
      await Promise.all(candidates.map(async (c) => this.dispatch(c)));
    } finally {
      this.isRunning = false;
    }
  }

  public getStatus(): SchedulerStatus {
    return {
      isRunning: this.isRunning,
      lastRunAt: this.lastRunAt?.toISOString() ?? null,
      nextRunAt: this.computeNextRunAt(),
      lastBatchSize: this.lastBatchSize,
    };
  }

  // Best-effort estimate based on the configured cron expression. We only
  // implement the simple `*/N * * * *` pattern used by the notifications cron
  // — anything else falls back to null so callers can render "unknown".
  private computeNextRunAt(): string | null {
    const match = config.notifications.cronExpression.match(
      /^\*\/(\d+) \* \* \* \*$/,
    );
    if (match === null) {
      return null;
    }
    const intervalMinutes = Number.parseInt(match[1] ?? "", 10);
    if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
      return null;
    }
    const now = new Date();
    const nextMinute =
      Math.floor(now.getMinutes() / intervalMinutes) * intervalMinutes +
      intervalMinutes;
    const next = new Date(now);
    next.setSeconds(0, 0);
    next.setMinutes(nextMinute);
    return next.toISOString();
  }

  private async loadCandidates(): Promise<Candidate[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase.rpc("pick_notification_candidates", {
      p_window_start_hour: config.notifications.localWindowStartHour,
      p_window_end_hour: config.notifications.localWindowEndHour,
      p_max_per_day: config.notifications.maxPerDay,
      p_min_minutes_between: config.notifications.minMinutesBetween,
    });

    if (error !== null) {
      this.logger.error(
        "Failed to load notification candidates",
        error.message,
      );
      return [];
    }

    return data;
  }

  private async dispatch(candidate: Candidate): Promise<void> {
    const coach = COACH_BY_ID.get(candidate.coach_id);
    if (coach === undefined) {
      this.logger.warn(
        `Unknown coach_id=${String(candidate.coach_id)} for user ${candidate.user_id}`,
      );
      return;
    }

    try {
      const copy = await this.notificationCopyService.generate({
        coach,
        language: candidate.language,
        timeOfDay: bucketTimeOfDay(candidate.local_hour),
        goalTitle: candidate.goal_title,
        userMotivationQuote: candidate.user_motivation_quote,
        weeklyObjectives: toStringList(candidate.weekly_objectives),
        weeklyTaskCompleted: candidate.weekly_task_completed,
        weeklyTaskTotal: candidate.weekly_task_total,
        recentCompletedTitles: candidate.recent_completed_titles ?? [],
        nextTaskTitle: candidate.next_task_title,
      });
      if (copy === null) {
        return;
      }
      await this.notificationsService.sendToUser(
        candidate.user_id,
        copy.title,
        copy.body,
      );
      await this.notificationSendsService.recordSend(
        candidate.user_id,
        copy.title,
        copy.body,
      );
    } catch (error) {
      this.logger.error(
        `Dispatch failed for user ${candidate.user_id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}

function bucketTimeOfDay(hour: number): TimeOfDay {
  if (hour < AFTERNOON_START_HOUR) {
    return "morning";
  }
  if (hour < EVENING_START_HOUR) {
    return "afternoon";
  }
  return "evening";
}

function toStringList(value: Json | null): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}
