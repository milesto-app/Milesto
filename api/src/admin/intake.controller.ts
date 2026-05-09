import { Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AdminGuard } from "../common/guards/admin.guard.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import { IntakeReembedService } from "../intake/intake-reembed.service.js";
import type { ReembedResult } from "../intake/types/intake.types.js";
import { ListBatchesQueryDto } from "./dto/list-batches-query.dto.js";
import { AdminIntakeService } from "./intake.service.js";
import type { AdminIntakeBatchList } from "./intake.types.js";

@ApiTags("Admin")
@ApiBearerAuth()
@Controller("admin/intake")
@UseGuards(AuthGuard, AdminGuard)
export class AdminIntakeController {
  constructor(
    private readonly intakeService: AdminIntakeService,
    private readonly reembedService: IntakeReembedService,
  ) {}

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

  @Post("reembed-missing")
  @ApiOperation({
    summary: "Retry embedding for all entries that failed to embed",
  })
  @ApiResponse({ status: 201, description: "Re-embedding results returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admin access required" })
  public async reembedMissing(): Promise<ReembedResult> {
    return this.reembedService.reembedMissing();
  }
}
