import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
import { DaysWindowQueryDto } from "./dto/days-window-query.dto.js";
import { ListSubscriptionsQueryDto } from "./dto/list-subscriptions-query.dto.js";
import { RecentEventsQueryDto } from "./dto/recent-events-query.dto.js";
import { SubscriptionsService } from "./subscriptions.service.js";
import type {
  AdminSubscriptionChurn,
  AdminSubscriptionEventList,
  AdminSubscriptionList,
  AdminSubscriptionMrrArr,
} from "./subscriptions.types.js";

@ApiTags("Admin")
@ApiBearerAuth()
@Controller("admin/subscriptions")
@UseGuards(AuthGuard, AdminGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiOperation({
    summary: "List subscriptions",
    description:
      "Paginated list of profiles filtered by subscription_status, joined with auth email.",
  })
  @ApiResponse({ status: 200, description: "Subscriptions returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admin access required" })
  public async listSubscriptions(
    @Query() query: ListSubscriptionsQueryDto,
  ): Promise<AdminSubscriptionList> {
    return this.subscriptionsService.listSubscriptions(
      query.page,
      query.perPage,
      query.status,
    );
  }

  @Get("distribution")
  @ApiOperation({
    summary: "Subscription status distribution",
    description: "Counts profiles grouped by subscription_status.",
  })
  @ApiResponse({ status: 200, description: "Distribution returned" })
  public async getDistribution(): Promise<Record<string, number>> {
    return this.subscriptionsService.getDistribution();
  }

  @Get("mrr-arr")
  @ApiOperation({
    summary: "MRR and ARR estimate",
    description:
      "Counts active profiles per product and applies configured pricing to compute MRR and ARR.",
  })
  @ApiResponse({ status: 200, description: "MRR/ARR returned" })
  public async getMrrArr(): Promise<AdminSubscriptionMrrArr> {
    return this.subscriptionsService.getMrrArr();
  }

  @Get("churn")
  @ApiOperation({
    summary: "Churn over a trailing window",
    description:
      "Counts profiles that expired or were revoked within the window vs. those still active.",
  })
  @ApiResponse({ status: 200, description: "Churn returned" })
  public async getChurn(
    @Query() query: DaysWindowQueryDto,
  ): Promise<AdminSubscriptionChurn> {
    return this.subscriptionsService.getChurn(query.days);
  }

  @Get("recent-events")
  @ApiOperation({
    summary: "Recent App Store Server notifications",
    description:
      "Returns the most recent processed_notifications rows ordered by received_at desc.",
  })
  @ApiResponse({ status: 200, description: "Events returned" })
  public async getRecentEvents(
    @Query() query: RecentEventsQueryDto,
  ): Promise<AdminSubscriptionEventList> {
    return this.subscriptionsService.getRecentEvents(query.limit);
  }

  @Post("refresh/:userId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Refresh subscription state for a user via App Store Server API",
  })
  @ApiParam({ name: "userId", description: "Auth user UUID" })
  @ApiResponse({
    status: 200,
    description: "Subscription refreshed",
  })
  public async refreshSubscription(
    @Param("userId", ParseUUIDPipe) userId: string,
  ): Promise<unknown> {
    return this.subscriptionsService.refreshSubscription(userId);
  }
}
