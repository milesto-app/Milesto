import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Conversation,
  ConversationListResult,
  ConversationPreview,
  MessageListResult,
  StoredMessage,
} from './types/chat.types.js';
import type { ListConversationsQueryDto } from './dto/list-conversations-query.dto.js';
import type { ListMessagesQueryDto } from './dto/list-messages-query.dto.js';

const PREVIEW_MAX_LENGTH = 100;

@Injectable()
export class ChatListService {
  private readonly logger = new Logger(ChatListService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async listConversations(
    userId: string,
    query: ListConversationsQueryDto,
  ): Promise<ConversationListResult> {
    const supabase = this.getClient();
    let builder = supabase
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1);

    if (query.goalId !== undefined) {
      builder = builder.eq('goal_id', query.goalId);
    }

    const { data, error, count } = await builder;

    if (error !== null) {
      this.logger.error(`Failed to list conversations: ${error.message}`);
      throw new Error(error.message);
    }

    const conversations = (data as Conversation[] | null) ?? [];
    const previews = await this.attachPreviews(conversations);
    return { conversations: previews, total: count ?? 0 };
  }

  public async getMessagesPaginated(
    conversationId: string,
    query: ListMessagesQueryDto,
  ): Promise<MessageListResult> {
    const supabase = this.getClient();
    const fetchLimit = query.limit + 1;

    let builder = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(fetchLimit);

    if (query.before !== undefined) {
      builder = builder.lt('created_at', query.before);
    }

    const { data, error } = await builder;

    if (error !== null) {
      this.logger.error(`Failed to fetch messages: ${error.message}`);
      throw new Error(error.message);
    }

    const rows = (data as StoredMessage[] | null) ?? [];
    const trimmed = rows.length > query.limit ? rows.slice(1) : rows;
    return { messages: trimmed.reverse(), has_more: rows.length > query.limit };
  }

  private async attachPreviews(
    conversations: Conversation[],
  ): Promise<ConversationPreview[]> {
    if (conversations.length === 0) {
      return [];
    }

    const ids = conversations.map((c) => c.id);
    const supabase = this.getClient();
    const { data } = await supabase
      .from('messages')
      .select('conversation_id, content, created_at')
      .in('conversation_id', ids)
      .eq('role', 'user')
      .order('created_at', { ascending: true });

    const previewMap = new Map<string, string>();
    for (const row of (data ?? []) as {
      conversation_id: string;
      content: string | null;
    }[]) {
      if (!previewMap.has(row.conversation_id) && row.content !== null) {
        const text =
          row.content.length > PREVIEW_MAX_LENGTH
            ? `${row.content.slice(0, PREVIEW_MAX_LENGTH)}...`
            : row.content;
        previewMap.set(row.conversation_id, text);
      }
    }

    return conversations.map((c) => ({
      id: c.id,
      goal_id: c.goal_id,
      created_at: c.created_at,
      updated_at: c.updated_at,
      preview: previewMap.get(c.id) ?? null,
    }));
  }

  private getClient(): SupabaseClient {
    return this.supabaseService.getAdminClient() as unknown as SupabaseClient;
  }
}
