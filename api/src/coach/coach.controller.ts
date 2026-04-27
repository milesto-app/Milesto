import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AuthGuard } from "../common/guards/auth.guard.js";
import { CoachService } from "./coach.service.js";
import type { PublicCoach } from "./coaches.config.js";

@ApiTags("coaches")
@ApiBearerAuth()
@Controller("coaches")
@UseGuards(AuthGuard)
export class CoachController {
  constructor(private readonly coachService: CoachService) {}

  @Get()
  @ApiOperation({ summary: "List all active coaches" })
  @ApiResponse({ status: 200, description: "List of active coaches" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  public listCoaches(): PublicCoach[] {
    return this.coachService.listPublicCoaches();
  }

  @Get(":coachId")
  @ApiOperation({ summary: "Get a single coach by ID" })
  @ApiParam({ name: "coachId", description: "The coach ID", type: Number })
  @ApiResponse({ status: 200, description: "Coach returned" })
  @ApiResponse({ status: 404, description: "Coach not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  public getCoach(
    @Param("coachId", ParseIntPipe) coachId: number,
  ): PublicCoach {
    return this.coachService.getPublicCoach(coachId);
  }
}
