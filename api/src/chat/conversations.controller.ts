import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { UserId } from "../common/decorators/user.decorator.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import { ChatHistoryService } from "./chat-history.service.js";
import type { ConversationPreview, StoredMessage } from "./types/chat.types.js";

@ApiTags("conversations")
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard)
export class ConversationsController {
  constructor(private readonly chatHistory: ChatHistoryService) {}

  @Get("goals/:goalId/conversations")
  @ApiOperation({
    summary: "List conversations for a goal (most recent first)",
  })
  @ApiParam({ name: "goalId", description: "Goal ID" })
  @ApiResponse({ status: HttpStatus.OK, description: "Conversations returned" })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  public async listForGoal(
    @Param("goalId") goalId: string,
    @UserId() userId: string,
  ): Promise<ConversationPreview[]> {
    return this.chatHistory.listForGoal(userId, goalId);
  }

  @Get("conversations/:conversationId/messages")
  @ApiOperation({ summary: "Get all messages in a conversation" })
  @ApiParam({ name: "conversationId", description: "Conversation ID" })
  @ApiResponse({ status: HttpStatus.OK, description: "Messages returned" })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Conversation not found",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  public async getMessages(
    @Param("conversationId") conversationId: string,
    @UserId() userId: string,
  ): Promise<StoredMessage[]> {
    return this.chatHistory.getMessagesForUser(conversationId, userId);
  }

  @Delete("conversations/:conversationId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a conversation" })
  @ApiParam({ name: "conversationId", description: "Conversation ID" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Conversation deleted",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Conversation not found",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  public async delete(
    @Param("conversationId") conversationId: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.chatHistory.deleteConversation(conversationId, userId);
  }
}
