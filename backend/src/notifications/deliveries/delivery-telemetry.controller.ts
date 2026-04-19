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

import { UserId } from "../../common/decorators/user.decorator.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { DeliveryTelemetryDto } from "./delivery-telemetry.dto.js";
import { DeliveryTelemetryService } from "./delivery-telemetry.service.js";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications/delivery")
@UseGuards(AuthGuard)
export class DeliveryTelemetryController {
  constructor(private readonly telemetryService: DeliveryTelemetryService) {}

  @Post("received")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Acknowledge that a push was received by a device",
    description:
      "Called by the iOS NotificationServiceExtension. Idempotent: sets received_at only if null. Returns 204 even on unknown job_id / device_token to avoid leaking existence.",
  })
  @ApiResponse({ status: 204, description: "Recorded or no-op" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  public async received(
    @UserId() userId: string,
    @Body() dto: DeliveryTelemetryDto,
  ): Promise<void> {
    await this.telemetryService.markReceived(
      userId,
      dto.jobId,
      dto.deviceToken,
    );
  }

  @Post("opened")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Acknowledge that a push was opened by the user",
    description:
      "Called by the iOS UNUserNotificationCenterDelegate on tap. Idempotent: sets opened_at only if null.",
  })
  @ApiResponse({ status: 204, description: "Recorded or no-op" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  public async opened(
    @UserId() userId: string,
    @Body() dto: DeliveryTelemetryDto,
  ): Promise<void> {
    await this.telemetryService.markOpened(userId, dto.jobId, dto.deviceToken);
  }
}
