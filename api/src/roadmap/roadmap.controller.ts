import {
  Controller,
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
import { RoadmapService } from "./roadmap.service.js";
import type { Roadmap } from "./types/roadmap.types.js";
import type { WeeklyPlan } from "./types/weekly-plan.types.js";
import { WeeklyPlanService } from "./weekly-plan.service.js";

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

  @Post("weekly-plan/generate")
  @ApiOperation({ summary: "Explicitly generate a new weekly plan" })
  @ApiParam({ name: "goalId", description: "Goal ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Newly generated weekly plan",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Goal has no active roadmap",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "No roadmap found for this goal",
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: "Rate limit exceeded",
  })
  @Throttle({
    default: {
      limit: config.throttle.weeklyPlanGenerateLimit,
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
