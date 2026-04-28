import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
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

@ApiTags("debrief")
@ApiBearerAuth()
@Controller("goals/:goalId/debrief")
@UseGuards(AuthGuard)
export class DebriefController {
  constructor(private readonly debriefService: DebriefService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({
    default: {
      limit: config.throttle.aiEndpointLimit,
      ttl: config.throttle.aiEndpointTtlMs,
    },
  })
  @ApiOperation({ summary: "Submit end-of-week debrief" })
  @ApiParam({ name: "goalId", description: "Goal ID" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Debrief submitted successfully",
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Invalid input" })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Debrief already submitted for this weekly plan",
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
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
