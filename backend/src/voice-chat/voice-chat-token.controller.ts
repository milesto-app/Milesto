import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { UserId } from '../common/decorators/user.decorator.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { SetElevenLabsConversationIdDto } from './dto/set-elevenlabs-conversation-id.dto.js';
import { VoiceChatSessionStore } from './voice-chat-session.store.js';
import { VoiceChatTokenService } from './voice-chat-token.service.js';

@ApiTags('voice-chat')
@ApiBearerAuth()
@Controller('voice-chat')
@UseGuards(AuthGuard)
export class VoiceChatTokenController {
  constructor(
    private readonly tokenService: VoiceChatTokenService,
    private readonly sessionStore: VoiceChatSessionStore,
  ) {}

  @Post('session')
  @ApiOperation({ summary: 'Create a new voice chat session' })
  @ApiResponse({ status: 201, description: 'Session created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Goal or conversation not found' })
  async createSession(
    @Body() dto: CreateSessionDto,
    @UserId() userId: string,
  ): Promise<{
    signedUrl: string;
    conversationId: string;
    sessionId: string;
    sessionSecret: string;
    overrides: unknown;
  }> {
    return this.tokenService.createSession(
      userId,
      dto.goalId,
      dto.conversationId,
    );
  }

  @Patch('session/:sessionId/elevenlabs-conversation')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set the ElevenLabs conversation ID for a session' })
  @ApiResponse({ status: 204, description: 'Conversation ID set' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not session owner or expired' })
  async setElevenLabsConversationId(
    @Param('sessionId') sessionId: string,
    @Body() dto: SetElevenLabsConversationIdDto,
    @UserId() userId: string,
  ): Promise<void> {
    const session = await this.sessionStore.get(sessionId);

    if (!session) {
      throw new ForbiddenException('Session not found or expired');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Not session owner');
    }

    await this.sessionStore.setElevenLabsConversationId(
      sessionId,
      dto.elevenLabsConversationId,
    );
  }

  @Delete('session/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End a voice chat session' })
  @ApiResponse({ status: 204, description: 'Session ended' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not session owner' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async endSession(
    @Param('sessionId') sessionId: string,
    @UserId() userId: string,
  ): Promise<void> {
    const session = await this.sessionStore.get(sessionId);

    if (!session) {
      throw new ForbiddenException('Session not found or expired');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Not session owner');
    }

    await this.sessionStore.endSession(sessionId);
  }
}
