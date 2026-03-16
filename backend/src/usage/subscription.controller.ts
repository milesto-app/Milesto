import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { UserId } from '../common/decorators/user.decorator.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { SubscriptionService } from './subscription.service.js';
import { VerifySubscriptionDto } from './verify-subscription.dto.js';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('verify')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify and sync Apple subscription' })
  @ApiResponse({ status: 201, description: 'Subscription synced' })
  public async verify(
    @UserId() userId: string,
    @Body() dto: VerifySubscriptionDto,
  ): Promise<void> {
    return this.subscriptionService.verifyAndSync(userId, dto.jwsTransaction);
  }

  @Post('apple-webhook')
  @SkipThrottle()
  @ApiOperation({ summary: 'Apple Server Notifications V2 webhook' })
  @ApiResponse({ status: 201, description: 'Webhook processed' })
  public async handleWebhook(@Body() body: unknown): Promise<void> {
    return this.subscriptionService.handleWebhook(body);
  }
}
