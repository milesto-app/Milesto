import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
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
import type { WeeklyTask } from "./types/weekly-task.types.js";
import { WeeklyTaskService } from "./weekly-task.service.js";

@ApiTags("weekly-tasks")
@ApiBearerAuth()
@Controller("goals/:goalId/weekly-tasks")
@UseGuards(AuthGuard)
export class WeeklyTaskController {
  constructor(private readonly weeklyTaskService: WeeklyTaskService) {}

  @Get()
  @Throttle({
    default: {
      limit: config.throttle.globalLimit,
      ttl: config.throttle.aiEndpointTtlMs,
    },
  })
  @ApiOperation({
    summary: "Get weekly tasks for the active weekly plan",
  })
  @ApiParam({ name: "goalId", description: "Goal ID" })
  @ApiResponse({ status: HttpStatus.OK, description: "Weekly tasks array" })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "No active weekly plan",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
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
      limit: config.throttle.globalLimit,
      ttl: config.throttle.aiEndpointTtlMs,
    },
  })
  @ApiOperation({
    summary: "Toggle weekly task completion",
  })
  @ApiParam({ name: "goalId", description: "Goal ID" })
  @ApiParam({ name: "taskId", description: "Task ID" })
  @ApiResponse({ status: HttpStatus.OK, description: "Updated weekly task" })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Task not found",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
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
