import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";

import type { SchedulerStatus } from "../notifications/notification-scheduler.service.js";
import { NotificationSchedulerService } from "../notifications/notification-scheduler.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { SUBSCRIPTION_STATUS } from "../subscription/subscription-state.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import type {
  AdminBroadcastResult,
  AdminBroadcastSegment,
  AdminNotificationDevice,
  AdminNotificationDeviceList,
  AdminNotificationSend,
  AdminNotificationSendList,
} from "./notifications.types.js";

const TOKEN_LAST_CHARS = 4;
const MS_PER_DAY = 86_400_000;
const USER_PAGE_SIZE = 1000;

@Injectable()
export class AdminNotificationsService {
  private readonly logger = new Logger(AdminNotificationsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly schedulerService: NotificationSchedulerService,
  ) {}

  public async listSends(
    page: number,
    perPage: number,
    days: number,
    userId: string | undefined,
  ): Promise<AdminNotificationSendList> {
    const supabase = this.supabaseService.getAdminClient();
    const start = (page - 1) * perPage;
    const end = start + perPage - 1;
    const cutoffIso = new Date(Date.now() - days * MS_PER_DAY).toISOString();

    let query = supabase
      .from("notification_sends")
      .select("id, user_id, title, body, sent_at", { count: "exact" })
      .gte("sent_at", cutoffIso)
      .order("sent_at", { ascending: false })
      .range(start, end);

    if (userId !== undefined) {
      query = query.eq("user_id", userId);
    }

    const { data, count, error } = await query;
    if (error !== null) {
      this.logger.error(`Failed to list sends: ${error.message}`);
      throw new InternalServerErrorException(
        "Failed to list notification sends",
      );
    }

    const sends: AdminNotificationSend[] = data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      body: row.body,
      sentAt: row.sent_at,
    }));

    const total = count ?? 0;
    return {
      sends,
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    };
  }

  public async listDevices(
    page: number,
    perPage: number,
    userId: string | undefined,
  ): Promise<AdminNotificationDeviceList> {
    const supabase = this.supabaseService.getAdminClient();
    const start = (page - 1) * perPage;
    const end = start + perPage - 1;

    let query = supabase
      .from("device_tokens")
      .select(
        "id, user_id, platform, environment, token, created_at, updated_at",
        {
          count: "exact",
        },
      )
      .order("updated_at", { ascending: false })
      .range(start, end);

    if (userId !== undefined) {
      query = query.eq("user_id", userId);
    }

    const { data, count, error } = await query;
    if (error !== null) {
      this.logger.error(`Failed to list devices: ${error.message}`);
      throw new InternalServerErrorException("Failed to list devices");
    }

    const devices: AdminNotificationDevice[] = data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      platform: row.platform,
      environment: row.environment,
      tokenLast4: row.token.slice(-TOKEN_LAST_CHARS),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const total = count ?? 0;
    return {
      devices,
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    };
  }

  public async broadcast(
    title: string,
    body: string,
    data: Record<string, string> | undefined,
    segment: AdminBroadcastSegment,
  ): Promise<AdminBroadcastResult> {
    const userIds = await this.resolveSegment(segment);
    if (userIds.length === 0) {
      return { queued: false, recipientCount: 0 };
    }

    void this.notificationsService.sendBroadcast(userIds, title, body, data);

    return { queued: true, recipientCount: userIds.length };
  }

  public getSchedulerStatus(): SchedulerStatus {
    return this.schedulerService.getStatus();
  }

  private async resolveSegment(
    segment: AdminBroadcastSegment,
  ): Promise<string[]> {
    const supabase = this.supabaseService.getAdminClient();
    const userIds: string[] = [];
    let offset = 0;

    for (;;) {
      let query = supabase
        .from("users")
        .select("id, subscription_status")
        .range(offset, offset + USER_PAGE_SIZE - 1);

      if (segment === "pro") {
        query = query.eq("subscription_status", SUBSCRIPTION_STATUS.ACTIVE);
      }

      const { data, error } = await query;
      if (error !== null) {
        this.logger.error(
          `Failed to resolve segment ${segment}: ${error.message}`,
        );
        throw new InternalServerErrorException("Failed to resolve recipients");
      }

      for (const row of data) {
        userIds.push(row.id);
      }

      if (data.length < USER_PAGE_SIZE) {
        break;
      }
      offset += USER_PAGE_SIZE;
    }

    return userIds;
  }
}
