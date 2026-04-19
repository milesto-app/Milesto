import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AuthGuard } from "../common/guards/auth.guard.js";
import { CopyGenService } from "./copy/copy-gen.service.js";
import { DeviceTokensService } from "./device-tokens.service.js";
import { PreviewCopyDto } from "./dto/preview-copy.dto.js";
import { SendNotificationDto } from "./dto/send-notification.dto.js";
import { AdminGuard } from "./guards/admin.guard.js";
import { NotificationsService } from "./notifications.service.js";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
@UseGuards(AuthGuard, AdminGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly deviceTokensService: DeviceTokensService,
    private readonly copyGenService: CopyGenService,
  ) {}

  @Post("send")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Send a push notification (admin only)",
    description:
      "If userIds is omitted, broadcasts to all registered users. Sends are batched; response is returned before all sends complete.",
  })
  @ApiResponse({ status: 200, description: "Notification queued" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admin access required" })
  public async send(
    @Body() dto: SendNotificationDto,
  ): Promise<{ queued: boolean; recipientCount: number }> {
    const targetUserIds =
      dto.userIds !== undefined
        ? dto.userIds
        : await this.deviceTokensService.findAllUserIds();

    if (targetUserIds.length === 0) {
      return { queued: false, recipientCount: 0 };
    }

    void this.notificationsService.sendBroadcast(
      targetUserIds,
      dto.title,
      dto.body,
      dto.data,
    );

    return { queued: true, recipientCount: targetUserIds.length };
  }

  @Post("preview-copy")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Preview LLM-generated notification copy (admin only)",
    description:
      "Runs the copy-gen pipeline for the supplied kind/language/coach context and returns the generated copy (or failure metadata) without writing DB rows or enqueuing a push.",
  })
  @ApiResponse({ status: 200, description: "Preview generated" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admin access required" })
  public async previewCopy(@Body() dto: PreviewCopyDto): Promise<{
    status: "generated" | "failed";
    title: string | null;
    body: string | null;
    errorCode: string | null;
    model: string;
    promptVersion: string;
    personality: string;
    latencyMs: number;
    attemptsUsed: number;
    providerStatus: number | null;
  }> {
    const result = await this.copyGenService.generate({
      jobId: `admin-preview-${Date.now()}`,
      kind: dto.kind,
      language: dto.language,
      coachId: dto.coachId ?? null,
      stub: { title: dto.stubTitle, teaser: dto.stubTeaser },
      memoryHooks: dto.memoryHooks ?? {},
      kindSpecific: dto.kindSpecific ?? {},
      suppressStreakCopy: dto.suppressStreakCopy ?? false,
      inputHash: `admin-preview-${Date.now()}`,
      attemptNo: 0,
    });

    return {
      status: result.status,
      title: result.output?.title ?? null,
      body: result.output?.body ?? null,
      errorCode: result.errorCode ?? null,
      model: result.model,
      promptVersion: result.promptVersion,
      personality: result.personality,
      latencyMs: result.latencyMs,
      attemptsUsed: result.attemptsUsed,
      providerStatus: result.providerStatus,
    };
  }
}
