import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
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
import type { Task } from "../roadmap/types/task.types.js";
import { TaskService } from "./task.service.js";

@ApiTags("tasks")
@ApiBearerAuth()
@Controller("goals/:goalId/tasks")
@UseGuards(AuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @Throttle({
    default: {
      limit: config.throttle.globalLimit,
      ttl: config.throttle.aiEndpointTtlMs,
    },
  })
  @ApiOperation({
    summary: "Get tasks for the active milestone (lazy-generates if needed)",
  })
  @ApiParam({ name: "goalId", description: "Goal ID" })
  @ApiResponse({ status: HttpStatus.OK, description: "Tasks array" })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "No active milestone",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: "Rate limit exceeded",
  })
  public async getTasks(
    @Param("goalId") goalId: string,
    @UserId() userId: string,
  ): Promise<Task[]> {
    return this.taskService.getTasks(goalId, userId);
  }

  @Post("generate")
  @Throttle({
    default: {
      limit: config.throttle.milestoneActivationLimit,
      ttl: config.throttle.aiEndpointTtlMs,
    },
  })
  @ApiOperation({
    summary: "Explicitly (re)generate tasks for the active milestone",
  })
  @ApiParam({ name: "goalId", description: "Goal ID" })
  @ApiResponse({ status: HttpStatus.OK, description: "Newly generated tasks" })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "No active milestone",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: "Rate limit exceeded",
  })
  public async generateTasks(
    @Param("goalId") goalId: string,
    @UserId() userId: string,
  ): Promise<Task[]> {
    return this.taskService.generateTasks(goalId, userId);
  }

  @Patch(":taskId")
  @Throttle({
    default: {
      limit: config.throttle.globalLimit,
      ttl: config.throttle.aiEndpointTtlMs,
    },
  })
  @ApiOperation({
    summary: "Toggle task completion",
  })
  @ApiParam({ name: "goalId", description: "Goal ID" })
  @ApiParam({ name: "taskId", description: "Task ID" })
  @ApiResponse({ status: HttpStatus.OK, description: "Updated task" })
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
  ): Promise<Task> {
    return this.taskService.toggleTaskCompletion({
      taskId,
      goalId,
      userId,
      isCompleted: body.is_completed,
    });
  }
}
