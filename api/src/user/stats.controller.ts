import {
  BadRequestException,
  Controller,
  Get,
  HttpStatus,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { UserId } from "../common/decorators/user.decorator.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import type { StatsResponse } from "./stats.service.js";
import { StatsService } from "./stats.service.js";

@ApiTags("stats")
@ApiBearerAuth()
@Controller("me/stats")
@UseGuards(AuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @ApiOperation({
    summary: "Compute and return stats for a goal (server-side aggregation)",
  })
  @ApiQuery({ name: "goalId", description: "Goal ID", required: true })
  @ApiResponse({ status: HttpStatus.OK, description: "Stats returned" })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Goal not found" })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  public async getStats(
    @UserId() userId: string,
    @Query("goalId") goalId?: string,
  ): Promise<StatsResponse> {
    if (goalId === undefined || goalId.length === 0) {
      throw new BadRequestException("goalId query parameter is required");
    }
    return this.statsService.getForGoal(userId, goalId);
  }
}
