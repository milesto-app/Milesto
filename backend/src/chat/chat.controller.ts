import { Body, Controller, Logger, Post, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";

import { UserId } from "../common/decorators/user.decorator.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import { config } from "../config/app.config.js";
import { ChatService } from "./chat.service.js";
import { SendMessageDto } from "./dto/send-message.dto.js";
import type { ChatStreamEvent } from "./types/chat.types.js";

@ApiTags("chat")
@ApiBearerAuth()
@Controller("chat")
@UseGuards(AuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @Post("messages")
  @Throttle({ default: { limit: 10, ttl: config.throttle.aiEndpointTtlMs } })
  public async sendMessage(
    @Body() dto: SendMessageDto,
    @UserId() userId: string,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const sendEvent = (event: ChatStreamEvent): void => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      await this.chatService.handleMessage(userId, dto, sendEvent);
    } catch (error) {
      this.logger.error(
        `Chat message failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      sendEvent({ type: "error", message: "An unexpected error occurred" });
    } finally {
      res.end();
    }
  }
}
