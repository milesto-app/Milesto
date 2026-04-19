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
import {
  type PreviewContextOutput,
  PreviewContextService,
} from "./preview/preview-context.service.js";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
@UseGuards(AuthGuard, AdminGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly deviceTokensService: DeviceTokensService,
    private readonly copyGenService: CopyGenService,
    private readonly previewContextService: PreviewContextService,
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
  public async previewCopy(
    @Body() dto: PreviewCopyDto,
  ): Promise<PreviewCopyResponse> {
    const resolved = await this.resolvePreviewContext(dto);
    const merged = mergePreviewContext(dto, resolved);

    const result = await this.copyGenService.generate({
      jobId: `admin-preview-${Date.now()}`,
      kind: dto.kind,
      language: dto.language,
      coachId: merged.coachId,
      stub: { title: merged.stubTitle, teaser: merged.stubTeaser },
      memoryHooks: merged.memoryHooks,
      kindSpecific: merged.kindSpecific,
      suppressStreakCopy: merged.suppressStreakCopy,
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
      resolvedContext: {
        language: dto.language,
        coachId: merged.coachId,
        memoryHooks: merged.memoryHooks,
        kindSpecific: merged.kindSpecific,
      },
    };
  }

  private async resolvePreviewContext(
    dto: PreviewCopyDto,
  ): Promise<PreviewContextOutput | null> {
    if (dto.userId === undefined) {
      return null;
    }
    return this.previewContextService.build({
      userId: dto.userId,
      kind: dto.kind,
      languageOverride: dto.language,
      ...(dto.coachId !== undefined ? { coachIdOverride: dto.coachId } : {}),
    });
  }
}

interface PreviewCopyResponse {
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
  resolvedContext: {
    language: "en" | "fr";
    coachId: number | null;
    memoryHooks: Record<string, unknown>;
    kindSpecific: Record<string, unknown>;
  };
}

interface MergedPreviewInputs {
  coachId: number | null;
  memoryHooks: Record<string, unknown>;
  kindSpecific: Record<string, unknown>;
  stubTitle: string;
  stubTeaser: string;
  suppressStreakCopy: boolean;
}

function mergePreviewContext(
  dto: PreviewCopyDto,
  resolved: PreviewContextOutput | null,
): MergedPreviewInputs {
  return {
    coachId: resolveCoachId(dto, resolved),
    memoryHooks: mergeRecords(resolved?.memoryHooks, dto.memoryHooks),
    kindSpecific: mergeRecords(resolved?.kindSpecific, dto.kindSpecific),
    stubTitle: pickFirstNonEmpty([
      dto.stubTitle,
      resolved?.stubTitle,
      "Momentum",
    ]),
    stubTeaser: pickFirstNonEmpty([dto.stubTeaser, resolved?.stubTeaser, ""]),
    suppressStreakCopy: resolveSuppressStreakCopy(dto, resolved),
  };
}

function resolveCoachId(
  dto: PreviewCopyDto,
  resolved: PreviewContextOutput | null,
): number | null {
  return dto.coachId ?? resolved?.coachId ?? null;
}

function resolveSuppressStreakCopy(
  dto: PreviewCopyDto,
  resolved: PreviewContextOutput | null,
): boolean {
  return dto.suppressStreakCopy ?? resolved?.suppressStreakCopy ?? false;
}

function mergeRecords(
  base: Record<string, unknown> | undefined,
  override: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return { ...(base ?? {}), ...(override ?? {}) };
}

function pickFirstNonEmpty(
  candidates: ReadonlyArray<string | undefined | null>,
): string {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== "") {
      return candidate;
    }
  }
  return "";
}
