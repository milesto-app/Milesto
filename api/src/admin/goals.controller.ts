import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AdminGuard } from "../common/guards/admin.guard.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import type {
  ProfileResult,
  ReembedResult,
} from "../intake/types/intake.types.js";
import type { Roadmap } from "../roadmap/types/roadmap.types.js";
import { ListEmbeddingsQueryDto } from "./dto/list-embeddings-query.dto.js";
import { ListGoalsQueryDto } from "./dto/list-goals-query.dto.js";
import { GoalsService } from "./goals.service.js";
import type {
  AdminGoalCoachMemory,
  AdminGoalDebrief,
  AdminGoalDetail,
  AdminGoalEmbedding,
  AdminGoalList,
  AdminGoalRoadmap,
  AdminGoalTask,
  AdminIntakeBatch,
} from "./goals.types.js";

@ApiTags("Admin")
@ApiBearerAuth()
@Controller("admin/goals")
@UseGuards(AuthGuard, AdminGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  @ApiOperation({
    summary: "List goals",
    description:
      "Paginated list of non-deleted goals with optional status and userId filters.",
  })
  @ApiResponse({ status: 200, description: "Goals returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admin access required" })
  public async listGoals(
    @Query() query: ListGoalsQueryDto,
  ): Promise<AdminGoalList> {
    return this.goalsService.listGoals(
      query.page,
      query.perPage,
      query.status,
      query.userId,
    );
  }

  @Get(":id")
  @ApiOperation({
    summary: "Goal detail with profile + roadmap status fields",
  })
  @ApiParam({ name: "id", description: "Goal UUID" })
  @ApiResponse({ status: 200, description: "Goal returned" })
  @ApiResponse({ status: 404, description: "Goal not found" })
  public async getGoal(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AdminGoalDetail> {
    return this.goalsService.getGoal(id);
  }

  @Get(":id/intake")
  @ApiOperation({
    summary: "Intake batches with their questions and stored answers",
  })
  @ApiParam({ name: "id", description: "Goal UUID" })
  @ApiResponse({ status: 200, description: "Intake returned" })
  @ApiResponse({ status: 404, description: "Goal not found" })
  public async getIntake(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AdminIntakeBatch[]> {
    return this.goalsService.getIntake(id);
  }

  @Get(":id/roadmap")
  @ApiOperation({
    summary: "Roadmap status, milestones, and weekly plans for a goal",
  })
  @ApiParam({ name: "id", description: "Goal UUID" })
  @ApiResponse({ status: 200, description: "Roadmap returned" })
  @ApiResponse({ status: 404, description: "Goal not found" })
  public async getRoadmap(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AdminGoalRoadmap> {
    return this.goalsService.getRoadmap(id);
  }

  @Get(":id/tasks")
  @ApiOperation({
    summary: "Tasks for a goal",
  })
  @ApiParam({ name: "id", description: "Goal UUID" })
  @ApiResponse({ status: 200, description: "Tasks returned" })
  @ApiResponse({ status: 404, description: "Goal not found" })
  public async getTasks(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AdminGoalTask[]> {
    return this.goalsService.getTasks(id);
  }

  @Get(":id/debriefs")
  @ApiOperation({ summary: "Debriefs submitted for a goal" })
  @ApiParam({ name: "id", description: "Goal UUID" })
  @ApiResponse({ status: 200, description: "Debriefs returned" })
  @ApiResponse({ status: 404, description: "Goal not found" })
  public async getDebriefs(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AdminGoalDebrief[]> {
    return this.goalsService.getDebriefs(id);
  }

  @Get(":id/coach-memory")
  @ApiOperation({ summary: "Coach memory entries for a goal" })
  @ApiParam({ name: "id", description: "Goal UUID" })
  @ApiResponse({ status: 200, description: "Coach memory returned" })
  @ApiResponse({ status: 404, description: "Goal not found" })
  public async getCoachMemory(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AdminGoalCoachMemory[]> {
    return this.goalsService.getCoachMemory(id);
  }

  @Get(":id/embeddings")
  @ApiOperation({
    summary: "Context embeddings for a goal (vectors omitted)",
  })
  @ApiParam({ name: "id", description: "Goal UUID" })
  @ApiResponse({ status: 200, description: "Embeddings returned" })
  @ApiResponse({ status: 404, description: "Goal not found" })
  public async getEmbeddings(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: ListEmbeddingsQueryDto,
  ): Promise<AdminGoalEmbedding[]> {
    return this.goalsService.getEmbeddings(id, query.limit);
  }

  @Post(":id/regenerate-profile")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Force-regenerate the goal profile (bypasses retry limits)",
  })
  @ApiParam({ name: "id", description: "Goal UUID" })
  @ApiResponse({ status: 200, description: "Profile regeneration finished" })
  @ApiResponse({ status: 404, description: "Goal not found" })
  public async regenerateProfile(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ProfileResult> {
    return this.goalsService.regenerateProfile(id);
  }

  @Post(":id/regenerate-roadmap")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Force-regenerate the roadmap (deletes existing milestones, plans, tasks, debriefs)",
  })
  @ApiParam({ name: "id", description: "Goal UUID" })
  @ApiResponse({ status: 200, description: "Roadmap generation triggered" })
  @ApiResponse({ status: 404, description: "Goal not found" })
  public async regenerateRoadmap(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<Roadmap> {
    return this.goalsService.regenerateRoadmap(id);
  }

  @Post(":id/reembed")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Re-embed unembedded intake batches and profile for one goal",
  })
  @ApiParam({ name: "id", description: "Goal UUID" })
  @ApiResponse({ status: 200, description: "Re-embed results returned" })
  @ApiResponse({ status: 404, description: "Goal not found" })
  public async reembedGoal(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ReembedResult> {
    return this.goalsService.reembedGoal(id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      "Hard-delete a goal and all dependent rows (cascades intake, roadmap, debriefs, embeddings, conversations)",
  })
  @ApiParam({ name: "id", description: "Goal UUID" })
  @ApiResponse({ status: 204, description: "Goal deleted" })
  @ApiResponse({ status: 404, description: "Goal not found" })
  public async deleteGoal(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.goalsService.deleteGoal(id);
  }
}
