import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { UserId } from '../common/decorators/user.decorator.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { appConfig } from '../config/app.config.js';
import { CheckInService } from './check-in.service.js';
import { SubmitCheckInDto } from './dto/submit-check-in.dto.js';
import type { CheckIn } from './types/daily.types.js';

const HTTP_CREATED = 201;
const API_STATUS_OK = 200;
const API_STATUS_BAD_REQUEST = 400;
const API_STATUS_UNAUTHORIZED = 401;
const API_STATUS_CONFLICT = 409;
const API_STATUS_RATE_LIMIT = 429;
const AI_ENDPOINT_LIMIT = 10;

@ApiTags('checkin')
@ApiBearerAuth()
@Controller('goals/:goalId/checkin')
@UseGuards(AuthGuard)
export class CheckInController {
  constructor(private readonly checkInService: CheckInService) {}

  @Post()
  @HttpCode(HTTP_CREATED)
  @Throttle({
    default: {
      limit: AI_ENDPOINT_LIMIT,
      ttl: appConfig.throttle.aiEndpointTtlMs,
    },
  })
  @ApiOperation({ summary: 'Submit morning check-in' })
  @ApiParam({ name: 'goalId', description: 'Goal ID' })
  @ApiResponse({
    status: HTTP_CREATED,
    description: 'Check-in submitted successfully',
  })
  @ApiResponse({
    status: API_STATUS_BAD_REQUEST,
    description: 'Invalid energy_level or goal has no active roadmap',
  })
  @ApiResponse({ status: API_STATUS_UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: API_STATUS_CONFLICT,
    description: 'Check-in already submitted for this goal today',
  })
  @ApiResponse({
    status: API_STATUS_RATE_LIMIT,
    description: 'Rate limit exceeded',
  })
  public async submitCheckIn(
    @Param('goalId') goalId: string,
    @UserId() userId: string,
    @Body() dto: SubmitCheckInDto,
  ): Promise<CheckIn> {
    return this.checkInService.submitCheckIn(goalId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get check-in history for goal' })
  @ApiParam({ name: 'goalId', description: 'Goal ID' })
  @ApiResponse({
    status: API_STATUS_OK,
    description: 'Check-in history returned',
  })
  @ApiResponse({ status: API_STATUS_UNAUTHORIZED, description: 'Unauthorized' })
  public async getCheckInHistory(
    @Param('goalId') goalId: string,
    @UserId() userId: string,
  ): Promise<CheckIn[]> {
    return this.checkInService.getCheckInHistory(goalId, userId);
  }
}
