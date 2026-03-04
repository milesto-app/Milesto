import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
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
import { DailyObjectiveService } from './daily-objective.service.js';
import { UpdateDailyObjectiveDto } from './dto/update-daily-objective.dto.js';
import type { DailyObjective } from './types/daily.types.js';

const API_STATUS_OK = 200;
const API_STATUS_BAD_REQUEST = 400;
const API_STATUS_UNAUTHORIZED = 401;
const API_STATUS_NOT_FOUND = 404;
const API_STATUS_RATE_LIMIT = 429;
const GLOBAL_ENDPOINT_LIMIT = 60;

@ApiTags('daily-objectives')
@ApiBearerAuth()
@Controller('goals/:goalId/daily-objectives')
@UseGuards(AuthGuard)
export class DailyObjectiveController {
  constructor(private readonly dailyObjectiveService: DailyObjectiveService) {}

  @Get()
  @Throttle({
    default: {
      limit: GLOBAL_ENDPOINT_LIMIT,
      ttl: appConfig.throttle.aiEndpointTtlMs,
    },
  })
  @ApiOperation({
    summary: 'Get daily objectives, auto-generates if none exist for today',
  })
  @ApiParam({ name: 'goalId', description: 'Goal ID' })
  @ApiResponse({ status: API_STATUS_OK, description: 'Daily objectives array' })
  @ApiResponse({
    status: API_STATUS_BAD_REQUEST,
    description: 'Check-in required or no active weekly plan',
  })
  @ApiResponse({ status: API_STATUS_UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: API_STATUS_RATE_LIMIT,
    description: 'Rate limit exceeded',
  })
  public async getDailyObjectives(
    @Param('goalId') goalId: string,
    @UserId() userId: string,
  ): Promise<DailyObjective[]> {
    return this.dailyObjectiveService.getDailyObjectives(goalId, userId);
  }

  @Patch(':objectiveId')
  @Throttle({
    default: {
      limit: GLOBAL_ENDPOINT_LIMIT,
      ttl: appConfig.throttle.aiEndpointTtlMs,
    },
  })
  @ApiOperation({ summary: 'Mark daily objective as done or not done' })
  @ApiParam({ name: 'goalId', description: 'Goal UUID' })
  @ApiParam({ name: 'objectiveId', description: 'Daily objective UUID' })
  @ApiResponse({ status: API_STATUS_OK, description: 'Updated objective' })
  @ApiResponse({ status: API_STATUS_BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: API_STATUS_UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: API_STATUS_NOT_FOUND,
    description: 'Objective not found',
  })
  @ApiResponse({
    status: API_STATUS_RATE_LIMIT,
    description: 'Rate limit exceeded',
  })
  public async updateObjective(
    @Param('goalId') goalId: string,
    @Param('objectiveId') objectiveId: string,
    @UserId() userId: string,
    @Body() dto: UpdateDailyObjectiveDto,
  ): Promise<DailyObjective> {
    return this.dailyObjectiveService.updateDailyObjective({
      objectiveId,
      goalId,
      userId,
      isCompleted: dto.is_completed,
    });
  }
}
