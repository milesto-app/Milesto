import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { CoachesService } from "./coaches.service.js";
import type { AdminCoachSummary, AdminCoachUserList } from "./coaches.types.js";
import { ListCoachUsersQueryDto } from "./dto/list-coach-users-query.dto.js";

@ApiTags("Admin")
@ApiBearerAuth()
@Controller("admin/coaches")
@UseGuards(AuthGuard, AdminGuard)
export class CoachesController {
  constructor(private readonly coachesService: CoachesService) {}

  @Get()
  @ApiOperation({
    summary: "List coaches with user counts",
    description:
      "Returns the static coach roster augmented with the number of profiles assigned to each coach.",
  })
  @ApiResponse({ status: 200, description: "Coaches returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admin access required" })
  public async listCoaches(): Promise<AdminCoachSummary[]> {
    return this.coachesService.listCoaches();
  }

  @Get(":id/users")
  @ApiOperation({ summary: "Paginated list of users assigned to a coach" })
  @ApiParam({ name: "id", description: "Coach id" })
  @ApiResponse({ status: 200, description: "Users returned" })
  @ApiResponse({ status: 404, description: "Coach not found" })
  public async listCoachUsers(
    @Param("id", ParseIntPipe) id: number,
    @Query() query: ListCoachUsersQueryDto,
  ): Promise<AdminCoachUserList> {
    return this.coachesService.listCoachUsers(id, query.page, query.perPage);
  }
}
