import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { UserId } from "../common/decorators/user.decorator.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import { config } from "../config/app.config.js";
import { SubscriptionService } from "./subscription.service.js";
import {
  AppleWebhookDto,
  SyncSubscriptionDto,
  VerifySubscriptionDto,
} from "./verify-subscription.dto.js";

interface SubscriptionStatusResponse {
  status: string;
  expiresAt: string | null;
  productId: string | null;
  autoRenew: boolean | null;
  environment: string | null;
  source: string;
  lastSyncedAt: string | null;
}

@Controller("subscription")
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post("sync")
  @UseGuards(AuthGuard)
  @Throttle({
    default: {
      limit: config.subscription.verifyThrottleLimit,
      ttl: config.subscription.verifyThrottleTtlMs,
    },
  })
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Sync Apple subscription from App Store Server API",
  })
  @ApiResponse({ status: HttpStatus.OK, description: "Subscription synced" })
  @HttpCode(HttpStatus.OK)
  public async sync(
    @UserId() userId: string,
    @Body() dto: SyncSubscriptionDto,
  ): Promise<void> {
    return this.subscriptionService.syncWithTransaction(
      userId,
      dto.transactionJws,
    );
  }

  @Post("verify")
  @UseGuards(AuthGuard)
  @Throttle({
    default: {
      limit: config.subscription.verifyThrottleLimit,
      ttl: config.subscription.verifyThrottleTtlMs,
    },
  })
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Deprecated alias for subscription sync",
  })
  @ApiResponse({ status: HttpStatus.OK, description: "Subscription synced" })
  @HttpCode(HttpStatus.OK)
  public async verifyDeprecated(
    @UserId() userId: string,
    @Body() dto: VerifySubscriptionDto,
  ): Promise<void> {
    return this.subscriptionService.syncWithTransaction(
      userId,
      dto.jwsTransaction,
    );
  }

  @Get("status")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get authoritative subscription status from backend",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Current subscription status",
  })
  public async getStatus(
    @UserId() userId: string,
  ): Promise<SubscriptionStatusResponse> {
    return this.subscriptionService.getStatus(userId);
  }

  @Post("apple-webhook")
  @Throttle({
    default: {
      limit: config.subscription.webhookThrottleLimit,
      ttl: config.subscription.webhookThrottleTtlMs,
    },
  })
  @ApiOperation({ summary: "Apple Server Notifications V2 webhook" })
  @ApiResponse({ status: HttpStatus.OK, description: "Webhook processed" })
  @HttpCode(HttpStatus.OK)
  public async handleWebhook(@Body() body: AppleWebhookDto): Promise<void> {
    return this.subscriptionService.handleWebhook(body.signedPayload);
  }
}
