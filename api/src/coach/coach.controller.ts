import {
  Controller,
  Get,
  NotFoundException,
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
import type { CoachConfig, PublicCoach } from "./coaches.config.js";
import { COACH_BY_ID, COACHES } from "./coaches.config.js";

@ApiTags("coaches")
@ApiBearerAuth()
@Controller("coaches")
@UseGuards(AuthGuard)
export class CoachController {
  @Get()
  @ApiOperation({ summary: "List all active coaches" })
  @ApiResponse({ status: 200, description: "List of active coaches" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  public listCoaches(): PublicCoach[] {
    return COACHES.map(toPublic);
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
    const coach = COACH_BY_ID.get(coachId);
    if (coach === undefined) {
      throw new NotFoundException(`Coach with id ${String(coachId)} not found`);
    }
    return toPublic(coach);
  }
}

function toPublic(coach: CoachConfig): PublicCoach {
  return {
    id: coach.id,
    personality: coach.personality,
    displayName: coach.displayName,
    description: coach.description,
    icon: coach.icon,
  };
}
