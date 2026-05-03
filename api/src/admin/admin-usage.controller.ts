import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AdminGuard } from "../common/guards/admin.guard.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import { AdminUsageService } from "./admin-usage.service.js";
import type {
  AdminUsageByTypeEntry,
  AdminUsageCostEstimate,
  AdminUsageDaily,
  AdminUsageTopUser,
  AdminUsageTotals,
} from "./admin-usage.types.js";
import { DaysWindowQueryDto } from "./dto/days-window-query.dto.js";
import { TopUsersQueryDto } from "./dto/top-users-query.dto.js";
import { UsageDailyQueryDto } from "./dto/usage-daily-query.dto.js";

@ApiTags("Admin")
@ApiBearerAuth()
@Controller("admin/usage")
@UseGuards(AuthGuard, AdminGuard)
export class AdminUsageController {
  constructor(private readonly usageService: AdminUsageService) {}

  @Get("daily")
  @ApiOperation({
    summary: "Daily generation counts over a window",
    description:
      "Returns one entry per day in the window with per-type counts. Zero-usage days are filled.",
  })
  @ApiResponse({ status: 200, description: "Daily usage returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admin access required" })
  public async getDaily(
    @Query() query: UsageDailyQueryDto,
  ): Promise<AdminUsageDaily> {
    return this.usageService.getDaily(query.days, query.type);
  }

  @Get("totals")
  @ApiOperation({ summary: "Total generation counts grouped by type" })
  @ApiResponse({ status: 200, description: "Totals returned" })
  public async getTotals(
    @Query() query: DaysWindowQueryDto,
  ): Promise<AdminUsageTotals> {
    return this.usageService.getTotals(query.days);
  }

  @Get("by-type")
  @ApiOperation({
    summary: "Same data as /totals but shaped as an array for charting",
  })
  @ApiResponse({ status: 200, description: "By-type usage returned" })
  public async getByType(
    @Query() query: DaysWindowQueryDto,
  ): Promise<AdminUsageByTypeEntry[]> {
    return this.usageService.getByType(query.days);
  }

  @Get("top-users")
  @ApiOperation({
    summary: "Top users by generation count over a window",
  })
  @ApiResponse({ status: 200, description: "Top users returned" })
  public async getTopUsers(
    @Query() query: TopUsersQueryDto,
  ): Promise<AdminUsageTopUser[]> {
    return this.usageService.getTopUsers(query.limit, query.days);
  }

  @Get("cost-estimate")
  @ApiOperation({
    summary: "Estimated LLM cost over a window",
    description:
      "Sums prompt+completion tokens by model and prices via configured per-1M rates. Rows without token data are skipped; coverageRatio reports priced-row fraction.",
  })
  @ApiResponse({ status: 200, description: "Cost estimate returned" })
  public async getCostEstimate(
    @Query() query: DaysWindowQueryDto,
  ): Promise<AdminUsageCostEstimate> {
    return this.usageService.getCostEstimate(query.days);
  }
}
