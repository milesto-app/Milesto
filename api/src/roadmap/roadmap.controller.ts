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
import { RoadmapService } from "./roadmap.service.js";
import { RoadmapDataService } from "./roadmap-data.service.js";
import type { Roadmap } from "./types/roadmap.types.js";
import type { WeeklyPlanResponse } from "./types/week-state.types.js";
import type { WeeklyPlan } from "./types/weekly-plan.types.js";
import { WeekStateService } from "./week-state.service.js";
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
    private readonly roadmapDataService: RoadmapDataService,
    private readonly weekStateService: WeekStateService,
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
    return this.roadmapDataService.getRoadmap(goalId, userId);
  }

  @Get("weekly-plan")
  @ApiOperation({
    summary: "Read the current weekly plan and week state for a goal",
  })
  @ApiParam({ name: "goalId", description: "Goal ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      "Latest weekly plan wrapped with derived week state and next-week unlock date",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  public async getActiveWeeklyPlan(
    @Param("goalId") goalId: string,
    @UserId() userId: string,
  ): Promise<WeeklyPlanResponse> {
    return this.weekStateService.computeForGoal(goalId, userId);
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
    status: HttpStatus.CONFLICT,
    description: "Next weekly plan unlocks on a future date (user in advance)",
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
