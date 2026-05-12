import {
  Controller,
  Get,
  HttpStatus,
  Logger,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { UserId } from "../common/decorators/user.decorator.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import { config } from "../config/app.config.js";
import { MilestoneService } from "./milestone.service.js";
import { RoadmapService } from "./roadmap.service.js";
import type { Milestone, Roadmap } from "./types/roadmap.types.js";
import type { CurrentWeekResponse } from "./types/week-state.types.js";

@ApiTags("roadmap")
@ApiBearerAuth()
@Controller("goals/:goalId/roadmap")
@UseGuards(AuthGuard)
export class RoadmapController {
  private readonly logger = new Logger(RoadmapController.name);

  constructor(
    private readonly roadmapService: RoadmapService,
    private readonly milestoneService: MilestoneService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Read the roadmap for a goal (no generation)",
  })
  @ApiParam({ name: "goalId", description: "Goal ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Roadmap with milestones and current milestone id",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Roadmap not found",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  public async getRoadmap(
    @Param("goalId") goalId: string,
    @UserId() userId: string,
  ): Promise<Roadmap> {
    return this.roadmapService.getRoadmap(goalId, userId);
  }

  @Get("current-week")
  @ApiOperation({
    summary: "Read the current active milestone and week state for a goal",
  })
  @ApiParam({ name: "goalId", description: "Goal ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      "Active milestone wrapped with derived week state and next-week unlock date",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  public async getCurrentWeek(
    @Param("goalId") goalId: string,
    @UserId() userId: string,
  ): Promise<CurrentWeekResponse> {
    return this.milestoneService.getCurrentMilestone(goalId, userId);
  }

  @Post("generate")
  @ApiOperation({ summary: "Generate milestone roadmap for a goal" })
  @ApiParam({ name: "goalId", description: "Goal ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Roadmap with milestones generated successfully",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Goal not in valid status or max retries exceeded",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Generation already in progress",
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: "Rate limit exceeded",
  })
  @Throttle({
    default: {
      limit: config.throttle.roadmapGenerateLimit,
      ttl: config.throttle.aiEndpointTtlMs,
    },
  })
  public async generateRoadmap(
    @Param("goalId") goalId: string,
    @UserId() userId: string,
  ): Promise<Roadmap> {
    try {
      return await this.roadmapService.generateMilestones(goalId, userId);
    } catch (error) {
      this.logger.warn(
        `Roadmap generation rejected for goal ${goalId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  @Post("activate-next-milestone")
  @ApiOperation({ summary: "Activate the next milestone for a goal" })
  @ApiParam({ name: "goalId", description: "Goal ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Newly activated milestone",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "No milestone to activate or roadmap not found",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Next milestone unlocks on a future date (user in advance)",
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: "Rate limit exceeded",
  })
  @Throttle({
    default: {
      limit: config.throttle.milestoneActivationLimit,
      ttl: config.throttle.aiEndpointTtlMs,
    },
  })
  public async activateNextMilestone(
    @Param("goalId") goalId: string,
    @UserId() userId: string,
  ): Promise<Milestone> {
    return this.milestoneService.activateNextMilestone(goalId, userId);
  }
}
