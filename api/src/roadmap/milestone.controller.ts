import { Controller, Get, HttpStatus, Param, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { UserId } from "../common/decorators/user.decorator.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import { RoadmapDataService } from "./roadmap-data.service.js";
import type { Task } from "./types/task.types.js";

@ApiTags("milestones")
@ApiBearerAuth()
@Controller("milestones")
@UseGuards(AuthGuard)
export class MilestoneController {
  constructor(private readonly roadmapDataService: RoadmapDataService) {}

  @Get(":milestoneId/tasks")
  @ApiOperation({
    summary: "Get all tasks for a milestone",
  })
  @ApiParam({ name: "milestoneId", description: "Milestone ID" })
  @ApiResponse({ status: HttpStatus.OK, description: "Tasks returned" })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Milestone not found",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  public async getTasks(
    @Param("milestoneId") milestoneId: string,
    @UserId() userId: string,
  ): Promise<Task[]> {
    return this.roadmapDataService.getTasksForMilestone(milestoneId, userId);
  }
}
