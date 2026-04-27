import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
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
import type { WeeklyTask } from "./types/weekly-task.types.js";
import { WeeklyTaskService } from "./weekly-task.service.js";

const API_STATUS_OK = 200;
const API_STATUS_BAD_REQUEST = 400;
const API_STATUS_UNAUTHORIZED = 401;
const API_STATUS_NOT_FOUND = 404;
const API_STATUS_RATE_LIMIT = 429;
const GLOBAL_ENDPOINT_LIMIT = 60;

@ApiTags("weekly-tasks")
@ApiBearerAuth()
@Controller("goals/:goalId/weekly-tasks")
@UseGuards(AuthGuard)
export class WeeklyTaskController {
  constructor(private readonly weeklyTaskService: WeeklyTaskService) {}

  @Get()
  @Throttle({
    default: {
      limit: GLOBAL_ENDPOINT_LIMIT,
      ttl: config.throttle.aiEndpointTtlMs,
    },
  })
  @ApiOperation({
    summary: "Get weekly tasks for the active weekly plan",
  })
  @ApiParam({ name: "goalId", description: "Goal ID" })
  @ApiResponse({ status: API_STATUS_OK, description: "Weekly tasks array" })
  @ApiResponse({
    status: API_STATUS_BAD_REQUEST,
    description: "No active weekly plan",
  })
  @ApiResponse({ status: API_STATUS_UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({
    status: API_STATUS_RATE_LIMIT,
    description: "Rate limit exceeded",
  })
  public async getWeeklyTasks(
    @Param("goalId") goalId: string,
    @UserId() userId: string,
  ): Promise<WeeklyTask[]> {
    return this.weeklyTaskService.getWeeklyTasks(goalId, userId);
  }

  @Patch(":taskId")
  @Throttle({
    default: {
      limit: GLOBAL_ENDPOINT_LIMIT,
      ttl: config.throttle.aiEndpointTtlMs,
    },
  })
  @ApiOperation({
    summary: "Toggle weekly task completion",
  })
  @ApiParam({ name: "goalId", description: "Goal ID" })
  @ApiParam({ name: "taskId", description: "Task ID" })
  @ApiResponse({ status: API_STATUS_OK, description: "Updated weekly task" })
  @ApiResponse({
    status: API_STATUS_NOT_FOUND,
    description: "Task not found",
  })
  @ApiResponse({ status: API_STATUS_UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({
    status: API_STATUS_RATE_LIMIT,
    description: "Rate limit exceeded",
  })
  public async toggleTaskCompletion(
    @Param("goalId") goalId: string,
    @Param("taskId") taskId: string,
    @UserId() userId: string,
    @Body() body: { is_completed: boolean },
  ): Promise<WeeklyTask> {
    return this.weeklyTaskService.toggleTaskCompletion({
      taskId,
      goalId,
      userId,
      isCompleted: body.is_completed,
    });
  }
}
