import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AuthGuard } from "../common/guards/auth.guard.js";
import { DeviceTokensService } from "./device-tokens.service.js";
import { SendNotificationDto } from "./dto/send-notification.dto.js";
import { AdminGuard } from "./guards/admin.guard.js";
import { NotificationsService } from "./notifications.service.js";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
@UseGuards(AuthGuard, AdminGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly deviceTokensService: DeviceTokensService,
  ) {}

  @Post("send")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Send a push notification (admin only)",
    description:
      "If userIds is omitted, broadcasts to all registered users. Sends are batched; response is returned before all sends complete.",
  })
  @ApiResponse({ status: 200, description: "Notification queued" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admin access required" })
  public async send(
    @Body() dto: SendNotificationDto,
  ): Promise<{ queued: boolean; recipientCount: number }> {
    const targetUserIds =
      dto.userIds !== undefined
        ? dto.userIds
        : await this.deviceTokensService.findAllUserIds();

    if (targetUserIds.length === 0) {
      return { queued: false, recipientCount: 0 };
    }

    void this.notificationsService.sendBroadcast(
      targetUserIds,
      dto.title,
      dto.body,
      dto.data,
    );

    return { queued: true, recipientCount: targetUserIds.length };
  }
}
