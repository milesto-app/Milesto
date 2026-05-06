import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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

import { UserId } from "../common/decorators/user.decorator.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import type { Database } from "../supabase/database.types.js";
import { CreateGoalDto } from "./dto/create-goal.dto.js";
import { UpdateGoalDto } from "./dto/update-goal.dto.js";
import type { GoalProfileResult } from "./goal.service.js";
import { GoalService } from "./goal.service.js";

type GoalRow = Database["public"]["Tables"]["goals"]["Row"];

@ApiTags("Goals")
@ApiBearerAuth()
@Controller("goals")
@UseGuards(AuthGuard)
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  @Get()
  @ApiOperation({ summary: "List goals owned by the authenticated user" })
  @ApiResponse({ status: 200, description: "Goals returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  public async list(@UserId() userId: string): Promise<GoalRow[]> {
    return this.goalService.findAllForUser(userId);
  }

  @Get(":goalId")
  @ApiOperation({ summary: "Fetch a single goal by id" })
  @ApiParam({ name: "goalId", description: "The goal UUID" })
  @ApiResponse({ status: 200, description: "Goal returned" })
  @ApiResponse({ status: 404, description: "Goal not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  public async findOne(
    @UserId() userId: string,
    @Param("goalId") goalId: string,
  ): Promise<GoalRow> {
    return this.goalService.findOne(userId, goalId);
  }

  @Delete(":goalId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft-delete a goal" })
  @ApiParam({ name: "goalId", description: "The goal UUID" })
  @ApiResponse({ status: 204, description: "Goal deleted" })
  @ApiResponse({ status: 404, description: "Goal not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  public async delete(
    @UserId() userId: string,
    @Param("goalId") goalId: string,
  ): Promise<void> {
    await this.goalService.softDelete(userId, goalId);
  }

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

  @Patch(":goalId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Update goal fields",
    description:
      "Partial update — currently supports user_motivation_quote captured at onboarding.",
  })
  @ApiParam({ name: "goalId", description: "The goal UUID" })
  @ApiResponse({ status: 204, description: "Goal updated" })
  @ApiResponse({ status: 400, description: "No updatable fields provided" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  public async update(
    @UserId() userId: string,
    @Param("goalId") goalId: string,
    @Body() dto: UpdateGoalDto,
  ): Promise<void> {
    if (dto.user_motivation_quote === undefined) {
      throw new BadRequestException("No updatable fields provided");
    }
    await this.goalService.updateMotivationQuote(
      userId,
      goalId,
      dto.user_motivation_quote,
    );
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
