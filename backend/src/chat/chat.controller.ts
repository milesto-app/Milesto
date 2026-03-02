import { Body, Controller, Get, Logger, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { UserId } from '../common/decorators/user.decorator.js';
import { appConfig } from '../config/app.config.js';
import { ChatHistoryService } from './chat-history.service.js';
import { ChatListService } from './chat-list.service.js';
import { ChatService } from './chat.service.js';
import { ListConversationsQueryDto } from './dto/list-conversations-query.dto.js';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import type {
  ChatStreamEvent,
  ConversationListResult,
  MessageListResult,
} from './types/chat.types.js';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly chatHistoryService: ChatHistoryService,
    private readonly chatListService: ChatListService,
  ) {}

  @Post('messages')
  @Throttle({ default: { limit: 10, ttl: appConfig.throttle.aiEndpointTtlMs } })
  public async sendMessage(
    @Body() dto: SendMessageDto,
    @UserId() userId: string,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
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
      sendEvent({ type: 'error', message: 'An unexpected error occurred' });
    } finally {
      res.end();
    }
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List conversations with previews' })
  @ApiResponse({ status: 200, description: 'Paginated list of conversations' })
  public async listConversations(
    @UserId() userId: string,
    @Query() query: ListConversationsQueryDto,
  ): Promise<ConversationListResult> {
    return this.chatListService.listConversations(userId, query);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiResponse({ status: 200, description: 'Paginated list of messages' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  public async getMessages(
    @UserId() userId: string,
    @Param('conversationId') conversationId: string,
    @Query() query: ListMessagesQueryDto,
  ): Promise<MessageListResult> {
    await this.chatHistoryService.getConversation(conversationId, userId);
    return this.chatListService.getMessagesPaginated(conversationId, query);
  }
}
