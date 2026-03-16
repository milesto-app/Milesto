import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { UserId } from '../common/decorators/user.decorator.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { UsageService } from './usage.service.js';
import type { UsageStatus } from './usage.types.js';

@Controller('usage')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  @ApiOperation({ summary: 'Get current daily usage status' })
  @ApiResponse({ status: 200, description: 'Current usage status' })
  public async getUsage(@UserId() userId: string): Promise<UsageStatus> {
    return this.usageService.getUsage(userId);
  }
}
