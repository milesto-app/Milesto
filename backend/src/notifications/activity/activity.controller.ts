import {
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { UserId } from "../../common/decorators/user.decorator.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { ActivityService } from "./activity.service.js";
import { ActivityRateLimiter } from "./activity-rate-limiter.js";

@ApiTags("Activity")
@ApiBearerAuth()
@Controller("activity")
@UseGuards(AuthGuard)
export class ActivityController {
  private readonly logger = new Logger(ActivityController.name);
  private readonly rateLimiter = new ActivityRateLimiter();

  constructor(private readonly activityService: ActivityService) {}

  @Post("foreground")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Record an app-foreground activity event",
    description:
      "Touches profiles.last_active_at and appends a row to user_activity_events. Rate-limited to 1/min per user to absorb foreground storms. Best-effort: transient failures are logged but return 204 to avoid client retry storms.",
  })
  @ApiResponse({
    status: 204,
    description:
      "Recorded (or silently skipped by rate limit / transient failure)",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  public async foreground(@UserId() userId: string): Promise<void> {
    if (!this.rateLimiter.shouldRecord(userId)) {
      return;
    }
    try {
      await this.activityService.record(userId, "foreground");
    } catch (error) {
      this.logger.warn(
        `Foreground activity ping failed for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
