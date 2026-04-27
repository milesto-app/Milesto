import {
  Body,
  Controller,
  HttpCode,
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
import { DebriefService } from "./debrief.service.js";
import { SubmitDebriefDto } from "./dto/submit-debrief.dto.js";
import type { Debrief } from "./types/weekly-task.types.js";

const HTTP_CREATED = 201;
const API_STATUS_BAD_REQUEST = 400;
const API_STATUS_UNAUTHORIZED = 401;
const API_STATUS_CONFLICT = 409;
const API_STATUS_RATE_LIMIT = 429;
const AI_ENDPOINT_LIMIT = 10;

@ApiTags("debrief")
@ApiBearerAuth()
@Controller("goals/:goalId/debrief")
@UseGuards(AuthGuard)
export class DebriefController {
  constructor(private readonly debriefService: DebriefService) {}

  @Post()
  @HttpCode(HTTP_CREATED)
  @Throttle({
    default: {
      limit: AI_ENDPOINT_LIMIT,
      ttl: config.throttle.aiEndpointTtlMs,
    },
  })
  @ApiOperation({ summary: "Submit end-of-week debrief" })
  @ApiParam({ name: "goalId", description: "Goal ID" })
  @ApiResponse({
    status: HTTP_CREATED,
    description: "Debrief submitted successfully",
  })
  @ApiResponse({ status: API_STATUS_BAD_REQUEST, description: "Invalid input" })
  @ApiResponse({ status: API_STATUS_UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({
    status: API_STATUS_CONFLICT,
    description: "Debrief already submitted for this weekly plan",
  })
  @ApiResponse({
    status: API_STATUS_RATE_LIMIT,
    description: "Rate limit exceeded",
  })
  public async submitDebrief(
    @Param("goalId") goalId: string,
    @UserId() userId: string,
    @Body() dto: SubmitDebriefDto,
  ): Promise<Debrief> {
    return this.debriefService.submitDebrief(goalId, userId, dto);
  }
}
