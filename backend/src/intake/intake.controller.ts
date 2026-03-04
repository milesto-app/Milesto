import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
import { SubmitAnswersDto } from './dto/submit-answers.dto.js';
import { IntakeBatchService } from './intake-batch.service.js';
import { IntakeProfileService } from './intake-profile.service.js';

@ApiTags('Intake')
@ApiBearerAuth()
@Controller('goals/:goalId/intake')
@UseGuards(AuthGuard)
export class IntakeController {
  constructor(
    private readonly intakeBatchService: IntakeBatchService,
    private readonly intakeProfileService: IntakeProfileService,
  ) {}

  @Get('next-batch')
  @Throttle({
    default: {
      limit: appConfig.throttle.aiEndpointLimit,
      ttl: appConfig.throttle.aiEndpointTtlMs,
    },
  })
  @ApiOperation({ summary: 'Get the next unanswered intake batch' })
  @ApiParam({ name: 'goalId', description: 'The goal UUID' })
  @ApiResponse({
    status: 200,
    description: 'Next batch returned (or re-served if unanswered)',
  })
  @ApiResponse({
    status: 400,
    description: 'Intake is not active for this goal',
  })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  public async getNextBatch(
    @UserId() userId: string,
    @Param('goalId') goalId: string,
  ): Promise<unknown> {
    return this.intakeBatchService.getNextBatch(userId, goalId);
  }

  @Post('submit-batch')
  @Throttle({
    default: {
      limit: appConfig.throttle.aiEndpointLimit,
      ttl: appConfig.throttle.aiEndpointTtlMs,
    },
  })
  @ApiOperation({ summary: 'Submit answers for the current batch' })
  @ApiParam({ name: 'goalId', description: 'The goal UUID' })
  @ApiResponse({
    status: 201,
    description: 'Answers submitted, next batch or completion returned',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid answers or intake not active',
  })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  @ApiResponse({ status: 409, description: 'Batch already submitted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  public async submitBatch(
    @UserId() userId: string,
    @Param('goalId') goalId: string,
    @Body() dto: SubmitAnswersDto,
  ): Promise<unknown> {
    return this.intakeBatchService.submitBatch(userId, goalId, dto.answers);
  }

  @Post('retry-profile')
  @ApiOperation({ summary: 'Retry failed profile generation' })
  @ApiParam({ name: 'goalId', description: 'The goal UUID' })
  @ApiResponse({ status: 201, description: 'Profile generation retried' })
  @ApiResponse({
    status: 400,
    description: 'Goal not in failed state or max retries exceeded',
  })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  public async retryProfile(
    @UserId() userId: string,
    @Param('goalId') goalId: string,
  ): Promise<unknown> {
    return this.intakeProfileService.retryProfile(userId, goalId);
  }
}
