import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AdminGuard } from "../common/guards/admin.guard.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import type { SchedulerStatus } from "../notifications/notification-scheduler.service.js";
import { BroadcastDto } from "./dto/broadcast.dto.js";
import { ListDevicesQueryDto } from "./dto/list-devices-query.dto.js";
import { ListSendsQueryDto } from "./dto/list-sends-query.dto.js";
import { AdminNotificationsService } from "./notifications.service.js";
import type {
  AdminBroadcastResult,
  AdminBroadcastSegment,
  AdminNotificationDeviceList,
  AdminNotificationSendList,
} from "./notifications.types.js";

const DEFAULT_BROADCAST_SEGMENT: AdminBroadcastSegment = "all";

@ApiTags("Admin")
@ApiBearerAuth()
@Controller("admin/notifications")
@UseGuards(AuthGuard, AdminGuard)
export class AdminNotificationsController {
  constructor(
    private readonly adminNotificationsService: AdminNotificationsService,
  ) {}

  @Get("sends")
  @ApiOperation({
    summary: "List notification sends",
    description:
      "Paginated history of notifications sent, filtered by trailing days window and optional user.",
  })
  @ApiResponse({ status: 200, description: "Sends returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admin access required" })
  public async listSends(
    @Query() query: ListSendsQueryDto,
  ): Promise<AdminNotificationSendList> {
    return this.adminNotificationsService.listSends(
      query.page,
      query.perPage,
      query.days,
      query.userId,
    );
  }

  @Get("devices")
  @ApiOperation({
    summary: "List registered device tokens",
    description: "Paginated device token list with optional user filter.",
  })
  @ApiResponse({ status: 200, description: "Devices returned" })
  public async listDevices(
    @Query() query: ListDevicesQueryDto,
  ): Promise<AdminNotificationDeviceList> {
    return this.adminNotificationsService.listDevices(
      query.page,
      query.perPage,
      query.userId,
    );
  }

  @Post("broadcast")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Broadcast a push notification to a user segment",
    description:
      "Resolves recipient user IDs from `segment` (all | pro) and queues an APNs broadcast.",
  })
  @ApiResponse({ status: 200, description: "Broadcast queued" })
  public async broadcast(
    @Body() body: BroadcastDto,
  ): Promise<AdminBroadcastResult> {
    return this.adminNotificationsService.broadcast(
      body.title,
      body.body,
      body.data,
      body.segment ?? DEFAULT_BROADCAST_SEGMENT,
    );
  }

  @Get("scheduler-status")
  @ApiOperation({
    summary: "Notification scheduler status",
    description:
      "Returns whether the periodic notification dispatcher is running, last/next run time, and last batch size.",
  })
  @ApiResponse({ status: 200, description: "Status returned" })
  public getSchedulerStatus(): SchedulerStatus {
    return this.adminNotificationsService.getSchedulerStatus();
  }
}
