import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

import { COACH_BY_ID } from "../coach/coaches.config.js";
import { config } from "../config/app.config.js";
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
  next_task_title: string | null;
}

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationCopyService: NotificationCopyService,
    private readonly notificationSendsService: NotificationSendsService,
  ) {}

  @Cron(config.notifications.cronExpression)
  public async tick(): Promise<void> {
    const candidates = await this.loadCandidates();
    if (candidates.length === 0) {
      return;
    }
    this.logger.log(
      `Dispatching nudges to ${String(candidates.length)} candidates`,
    );
    await Promise.all(candidates.map(async (c) => this.dispatch(c)));
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
