import {
  Body,
  Controller,
  Delete,
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

import { UserId } from "../common/decorators/user.decorator.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import { DeviceTokensService } from "./device-tokens.service.js";
import { RegisterTokenDto } from "./dto/register-token.dto.js";
import { UnregisterTokenDto } from "./dto/unregister-token.dto.js";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications/tokens")
@UseGuards(AuthGuard)
export class DeviceTokensController {
  constructor(private readonly deviceTokensService: DeviceTokensService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Register a device token for push notifications" })
  @ApiResponse({ status: 204, description: "Token registered" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  public async register(
    @UserId() userId: string,
    @Body() dto: RegisterTokenDto,
  ): Promise<void> {
    await this.deviceTokensService.upsert(userId, dto.token, dto.environment);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Unregister a device token" })
  @ApiResponse({ status: 204, description: "Token removed" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  public async unregister(
    @UserId() userId: string,
    @Body() dto: UnregisterTokenDto,
  ): Promise<void> {
    await this.deviceTokensService.delete(userId, dto.token);
  }
}
