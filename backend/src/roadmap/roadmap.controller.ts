import { Controller, Logger, Param, Post, UseGuards } from "@nestjs/common";
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
import { RoadmapService } from "./roadmap.service.js";
import type { Roadmap } from "./types/roadmap.types.js";
import type { WeeklyPlan } from "./types/weekly-plan.types.js";
import { WeeklyPlanService } from "./weekly-plan.service.js";

const API_STATUS_OK = 200;
const API_STATUS_BAD_REQUEST = 400;
const API_STATUS_UNAUTHORIZED = 401;
const API_STATUS_NOT_FOUND = 404;
const API_STATUS_CONFLICT = 409;
const API_STATUS_RATE_LIMIT = 429;
const GENERATE_ROADMAP_LIMIT = 3;
const GENERATE_WEEKLY_LIMIT = 5;

@ApiTags("roadmap")
@ApiBearerAuth()
@Controller("goals/:goalId/roadmap")
@UseGuards(AuthGuard)
export class RoadmapController {
  private readonly logger = new Logger(RoadmapController.name);

  constructor(
    private readonly roadmapService: RoadmapService,
    private readonly weeklyPlanService: WeeklyPlanService,
  ) {}

  @Post("generate")
  @ApiOperation({ summary: "Generate milestone roadmap for a goal" })
  @ApiParam({ name: "goalId", description: "Goal ID" })
  @ApiResponse({
    status: API_STATUS_OK,
    description: "Roadmap with milestones generated successfully",
  })
  @ApiResponse({
    status: API_STATUS_BAD_REQUEST,
    description: "Goal not in valid status or max retries exceeded",
  })
  @ApiResponse({ status: API_STATUS_UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({
    status: API_STATUS_CONFLICT,
    description: "Generation already in progress",
  })
  @ApiResponse({
    status: API_STATUS_RATE_LIMIT,
    description: "Rate limit exceeded",
  })
  @Throttle({
    default: {
      limit: GENERATE_ROADMAP_LIMIT,
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

  @Post("weekly-plan/generate")
  @ApiOperation({ summary: "Explicitly generate a new weekly plan" })
  @ApiParam({ name: "goalId", description: "Goal ID" })
  @ApiResponse({
    status: API_STATUS_OK,
    description: "Newly generated weekly plan",
  })
  @ApiResponse({
    status: API_STATUS_BAD_REQUEST,
    description: "Goal has no active roadmap",
  })
  @ApiResponse({ status: API_STATUS_UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({
    status: API_STATUS_NOT_FOUND,
    description: "No roadmap found for this goal",
  })
  @ApiResponse({
    status: API_STATUS_RATE_LIMIT,
    description: "Rate limit exceeded",
  })
  @Throttle({
    default: {
      limit: GENERATE_WEEKLY_LIMIT,
      ttl: config.throttle.aiEndpointTtlMs,
    },
  })
  public async generateWeeklyPlan(
    @Param("goalId") goalId: string,
    @UserId() userId: string,
  ): Promise<WeeklyPlan> {
    return this.weeklyPlanService.generateWeeklyPlan(goalId, userId);
  }
}
