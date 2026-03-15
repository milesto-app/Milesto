import {
  Body,
  Controller,
  ForbiddenException,
  Logger,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';

import { ChatHistoryService } from '../chat/chat-history.service.js';
import { ChatToolRegistryService } from '../chat/chat-tool-registry.service.js';
import { ElevenLabsToolAuthGuard } from './guards/elevenlabs-tool-auth.guard.js';
import type { VoiceSession } from './voice-chat-session.store.js';

@ApiTags('voice-chat')
@Controller('voice-chat')
@SkipThrottle()
export class VoiceChatToolsController {
  private readonly logger = new Logger(VoiceChatToolsController.name);

  constructor(
    private readonly toolRegistryService: ChatToolRegistryService,
    private readonly chatHistoryService: ChatHistoryService,
  ) {}

  @Post('tools/:sessionId/:toolName')
  @UseGuards(ElevenLabsToolAuthGuard)
  @ApiOperation({ summary: 'Execute a tool call from ElevenLabs' })
  @ApiResponse({ status: 200, description: 'Tool result' })
  @ApiResponse({ status: 401, description: 'Invalid session credentials' })
  @ApiResponse({ status: 403, description: 'Session not active' })
  @ApiResponse({ status: 404, description: 'Tool not found' })
  async executeTool(
    @Param('toolName') toolName: string,
    @Body() body: Record<string, unknown>,
    @Req() request: Request,
  ): Promise<unknown> {
    const session = (
      request as unknown as Record<string, unknown>
    )['voiceSession'] as VoiceSession;

    if (session.status !== 'active') {
      throw new ForbiddenException('Session is not active');
    }

    const registry = this.toolRegistryService.getRegistry();
    const entry = registry.get(toolName);

    if (!entry) {
      throw new NotFoundException(`Tool "${toolName}" not found`);
    }

    const result = await entry.executor(body, {
      userId: session.userId,
      goalId: session.goalId,
    });

    try {
      await this.chatHistoryService.storeMessage(session.conversationId, {
        role: 'tool',
        content: JSON.stringify(result),
        tool_name: toolName,
      });
    } catch (error) {
      this.logger.error(
        `Failed to store tool call message: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return result;
  }
}
