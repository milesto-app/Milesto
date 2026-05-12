import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AdminGuard } from "../common/guards/admin.guard.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import { ListBatchesQueryDto } from "./dto/list-batches-query.dto.js";
import { AdminIntakeService } from "./intake.service.js";
import type { AdminIntakeBatchList } from "./intake.types.js";

@ApiTags("Admin")
@ApiBearerAuth()
@Controller("admin/intake")
@UseGuards(AuthGuard, AdminGuard)
export class AdminIntakeController {
  constructor(private readonly intakeService: AdminIntakeService) {}

  @Get("batches")
  @ApiOperation({
    summary: "List intake batches",
    description:
      "Paginated list of intake batches ordered by most recent, with question and answered counts. Optional goalId filter.",
  })
  @ApiResponse({ status: 200, description: "Batches returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admin access required" })
  public async listBatches(
    @Query() query: ListBatchesQueryDto,
  ): Promise<AdminIntakeBatchList> {
    return this.intakeService.listBatches(
      query.page,
      query.perPage,
      query.goalId,
    );
  }
}
