import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AdminGuard } from "../common/guards/admin.guard.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import { ActivityTimelineQueryDto } from "./dto/activity-timeline-query.dto.js";
import { RecentListQueryDto } from "./dto/recent-list-query.dto.js";
import { OverviewService } from "./overview.service.js";
import type {
  ActivityTimelineEntry,
  OverviewStats,
  RecentGoalSummary,
  RecentSignupSummary,
} from "./overview.types.js";

@ApiTags("Admin")
@ApiBearerAuth()
@Controller("admin/overview")
@UseGuards(AuthGuard, AdminGuard)
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get("stats")
  @ApiOperation({
    summary: "Dashboard summary stats",
    description:
      "Total users, active goals, pro subscriptions, and today's generation count.",
  })
  @ApiResponse({ status: 200, description: "Stats returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admin access required" })
  public async getStats(): Promise<OverviewStats> {
    return this.overviewService.getStats();
  }

  @Get("recent-goals")
  @ApiOperation({
    summary: "Recently created goals with user names",
  })
  @ApiResponse({ status: 200, description: "Recent goals returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admin access required" })
  public async getRecentGoals(
    @Query() query: RecentListQueryDto,
  ): Promise<RecentGoalSummary[]> {
    return this.overviewService.getRecentGoals(query.limit);
  }

  @Get("recent-signups")
  @ApiOperation({
    summary: "Recently signed up users with names",
  })
  @ApiResponse({ status: 200, description: "Recent signups returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admin access required" })
  public async getRecentSignups(
    @Query() query: RecentListQueryDto,
  ): Promise<RecentSignupSummary[]> {
    return this.overviewService.getRecentSignups(query.limit);
  }

  @Get("activity-timeline")
  @ApiOperation({
    summary: "Daily counts of signups, goals created, and messages sent",
  })
  @ApiResponse({ status: 200, description: "Activity timeline returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admin access required" })
  public async getActivityTimeline(
    @Query() query: ActivityTimelineQueryDto,
  ): Promise<ActivityTimelineEntry[]> {
    return this.overviewService.getActivityTimeline(query.days);
  }
}
