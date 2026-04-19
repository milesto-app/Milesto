import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { UserId } from "../common/decorators/user.decorator.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import type { Database } from "../supabase/database.types.js";
import { CreateGoalDto } from "./dto/create-goal.dto.js";
import type { GoalProfileResult } from "./goal.service.js";
import { GoalService } from "./goal.service.js";

type GoalRow = Database["public"]["Tables"]["goals"]["Row"];

@ApiTags("Goals")
@ApiBearerAuth()
@Controller("goals")
@UseGuards(AuthGuard)
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  @Post()
  @ApiOperation({ summary: "Create a new goal" })
  @ApiResponse({ status: 201, description: "Goal created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  public async create(
    @UserId() userId: string,
    @Body() dto: CreateGoalDto,
  ): Promise<GoalRow> {
    return this.goalService.create(userId, dto.description, dto.title);
  }

  @Get(":goalId/profile")
  @ApiOperation({ summary: "Get the AI-generated goal profile" })
  @ApiParam({ name: "goalId", description: "The goal UUID" })
  @ApiResponse({ status: 200, description: "Goal profile returned" })
  @ApiResponse({
    status: 404,
    description: "Goal not found or intake not complete",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  public async getGoalProfile(
    @UserId() userId: string,
    @Param("goalId") goalId: string,
  ): Promise<GoalProfileResult> {
    return this.goalService.getGoalProfile(userId, goalId);
  }
}
