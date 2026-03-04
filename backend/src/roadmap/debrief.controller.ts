import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { UserId } from '../common/decorators/user.decorator.js';
import { DebriefService } from './debrief.service.js';
import { SubmitDebriefDto } from './dto/submit-debrief.dto.js';
import { appConfig } from '../config/app.config.js';
import type { Debrief } from './types/daily.types.js';

const HTTP_CREATED = 201;
const API_STATUS_OK = 200;
const API_STATUS_BAD_REQUEST = 400;
const API_STATUS_UNAUTHORIZED = 401;
const API_STATUS_CONFLICT = 409;
const API_STATUS_RATE_LIMIT = 429;
const AI_ENDPOINT_LIMIT = 10;
const GLOBAL_ENDPOINT_LIMIT = 60;

@ApiTags('debrief')
@ApiBearerAuth()
@Controller('goals/:goalId/debrief')
@UseGuards(AuthGuard)
export class DebriefController {
  constructor(private readonly debriefService: DebriefService) {}

  @Post()
  @HttpCode(HTTP_CREATED)
  @Throttle({
    default: {
      limit: AI_ENDPOINT_LIMIT,
      ttl: appConfig.throttle.aiEndpointTtlMs,
    },
  })
  @ApiOperation({ summary: 'Submit end-of-day debrief' })
  @ApiParam({ name: 'goalId', description: 'Goal ID' })
  @ApiResponse({
    status: HTTP_CREATED,
    description: 'Debrief submitted successfully',
  })
  @ApiResponse({ status: API_STATUS_BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: API_STATUS_UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: API_STATUS_CONFLICT,
    description: 'Debrief already submitted for this goal today',
  })
  @ApiResponse({
    status: API_STATUS_RATE_LIMIT,
    description: 'Rate limit exceeded',
  })
  public async submitDebrief(
    @Param('goalId') goalId: string,
    @UserId() userId: string,
    @Body() dto: SubmitDebriefDto,
  ): Promise<Debrief> {
    return this.debriefService.submitDebrief(goalId, userId, dto);
  }

  @Get()
  @Throttle({
    default: {
      limit: GLOBAL_ENDPOINT_LIMIT,
      ttl: appConfig.throttle.globalTtlMs,
    },
  })
  @ApiOperation({ summary: 'Get debrief history for goal' })
  @ApiParam({ name: 'goalId', description: 'Goal ID' })
  @ApiResponse({
    status: API_STATUS_OK,
    description: 'Debrief history returned',
  })
  @ApiResponse({ status: API_STATUS_UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: API_STATUS_RATE_LIMIT,
    description: 'Rate limit exceeded',
  })
  public async getDebriefHistory(
    @Param('goalId') goalId: string,
    @UserId() userId: string,
  ): Promise<Debrief[]> {
    return this.debriefService.getDebriefHistory(goalId, userId);
  }
}
