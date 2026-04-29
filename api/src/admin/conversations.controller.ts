import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { ConversationsService } from "./conversations.service.js";
import type {
  AdminConversationList,
  AdminMessage,
  AdminMessageStats,
} from "./conversations.types.js";
import { ListConversationsQueryDto } from "./dto/list-conversations-query.dto.js";
import { MessagesStatsQueryDto } from "./dto/messages-stats-query.dto.js";

@ApiTags("Admin")
@ApiBearerAuth()
@Controller("admin")
@UseGuards(AuthGuard, AdminGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get("conversations")
  @ApiOperation({
    summary: "List conversations",
    description:
      "Paginated list of conversations with optional goalId and userId filters, ordered by most recently updated.",
  })
  @ApiResponse({ status: 200, description: "Conversations returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admin access required" })
  public async listConversations(
    @Query() query: ListConversationsQueryDto,
  ): Promise<AdminConversationList> {
    return this.conversationsService.listConversations(
      query.page,
      query.perPage,
      query.goalId,
      query.userId,
    );
  }

  @Get("conversations/:id/messages")
  @ApiOperation({
    summary: "List messages for a conversation",
    description:
      "Returns all stored messages (content, tool calls, tool results) ordered chronologically.",
  })
  @ApiParam({ name: "id", description: "Conversation UUID" })
  @ApiResponse({ status: 200, description: "Messages returned" })
  @ApiResponse({ status: 404, description: "Conversation not found" })
  public async getMessages(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AdminMessage[]> {
    return this.conversationsService.getMessages(id);
  }

  @Get("messages/stats")
  @ApiOperation({
    summary: "Aggregate message activity",
    description:
      "Per-day message counts (broken down by role) for the trailing window plus a tool-use breakdown across the same window.",
  })
  @ApiResponse({ status: 200, description: "Stats returned" })
  public async getMessageStats(
    @Query() query: MessagesStatsQueryDto,
  ): Promise<AdminMessageStats> {
    return this.conversationsService.getMessageStats(query.days);
  }
}
