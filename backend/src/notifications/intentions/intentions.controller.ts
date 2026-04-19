import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { UserId } from "../../common/decorators/user.decorator.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { UpdateIntentionDto } from "./dto/update-intention.dto.js";
import { UpsertIntentionDto } from "./dto/upsert-intention.dto.js";
import { IntentionsService } from "./intentions.service.js";

@ApiTags("Intentions")
@ApiBearerAuth()
@Controller("intentions")
@UseGuards(AuthGuard)
export class IntentionsController {
  constructor(private readonly intentionsService: IntentionsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Create or replace the if-then intention for a weekly task",
  })
  @ApiResponse({ status: 200, description: "Intention saved" })
  public async upsert(
    @UserId() userId: string,
    @Body() body: UpsertIntentionDto,
  ): Promise<unknown> {
    return this.intentionsService.upsert(userId, body);
  }

  @Get()
  @ApiOperation({
    summary: "Get the if-then intention captured for a weekly task (if any)",
  })
  @ApiResponse({ status: 200, description: "Intention row or null" })
  public async get(
    @UserId() userId: string,
    @Query("task_id") taskId: string,
  ): Promise<unknown> {
    return this.intentionsService.getForTask(userId, taskId);
  }

  @Patch(":taskId")
  @ApiOperation({ summary: "Patch an existing intention" })
  @ApiResponse({ status: 200, description: "Intention updated" })
  public async update(
    @UserId() userId: string,
    @Param("taskId") taskId: string,
    @Body() body: UpdateIntentionDto,
  ): Promise<unknown> {
    return this.intentionsService.update(userId, taskId, body);
  }

  @Delete(":taskId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete the intention for a weekly task" })
  @ApiResponse({ status: 204, description: "Intention deleted" })
  public async delete(
    @UserId() userId: string,
    @Param("taskId") taskId: string,
  ): Promise<void> {
    await this.intentionsService.delete(userId, taskId);
  }
}
