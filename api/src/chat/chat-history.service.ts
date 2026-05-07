import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";

import { config } from "../config/app.config.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import type {
  Conversation,
  ConversationPreview,
  StoredMessage,
} from "./types/chat.types.js";

export interface StoreMessageInput {
  role: "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: unknown[] | null;
  tool_call_id?: string | null;
  tool_name?: string | null;
}

@Injectable()
export class ChatHistoryService {
  private readonly logger = new Logger(ChatHistoryService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async createConversation(
    userId: string,
    goalId: string,
  ): Promise<Conversation> {
    const supabase = this.getClient();
    const { data, error } = (await supabase
      .from("conversations")
      .insert({ user_id: userId, goal_id: goalId })
      .select("*")
      .single()) as {
      data: Conversation | null;
      error: { message: string } | null;
    };

    if (error) {
      this.logger.error(`Failed to create conversation: ${error.message}`);
      throw new Error(error.message);
    }

    return data as Conversation;
  }

  public async getConversation(
    conversationId: string,
    userId: string,
  ): Promise<Conversation> {
    const supabase = this.getClient();
    const { data, error } = (await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single()) as {
      data: Conversation | null;
      error: { message: string } | null;
    };

    if (error) {
      throw new NotFoundException("Conversation not found");
    }

    return data as Conversation;
  }

  public async storeMessage(
    conversationId: string,
    message: StoreMessageInput,
  ): Promise<StoredMessage> {
    const supabase = this.getClient();
    const { data, error } = (await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: message.role,
        content: message.content ?? null,
        tool_calls: message.tool_calls ?? null,
        tool_call_id: message.tool_call_id ?? null,
        tool_name: message.tool_name ?? null,
      })
      .select("*")
      .single()) as {
      data: StoredMessage | null;
      error: { message: string } | null;
    };

    if (error) {
      this.logger.error(`Failed to store message: ${error.message}`);
      throw new Error(error.message);
    }

    return data as StoredMessage;
  }

  public async listForGoal(
    userId: string,
    goalId: string,
  ): Promise<ConversationPreview[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("conversations")
      .select(
        "id, goal_id, created_at, updated_at, messages(content, role, created_at)",
      )
      .eq("user_id", userId)
      .eq("goal_id", goalId)
      .order("updated_at", { ascending: false });

    if (error) {
      this.logger.error(`Failed to list conversations: ${error.message}`);
      throw new InternalServerErrorException("Failed to list conversations");
    }

    return data.map((row: Record<string, unknown>) => {
      const msgs =
        (row.messages as Array<{
          content: string | null;
          role: string;
          created_at: string;
        }> | null) ?? [];
      const lastUserOrAssistant = msgs
        .filter(
          (m) =>
            (m.role === "user" || m.role === "assistant") && m.content !== null,
        )
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
      return {
        id: row.id as string,
        goal_id: row.goal_id as string,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        preview: lastUserOrAssistant?.content ?? null,
      };
    });
  }

  public async deleteConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", userId)
      .select("id");
    if (error) {
      this.logger.error(`Failed to delete conversation: ${error.message}`);
      throw new InternalServerErrorException("Failed to delete conversation");
    }
    if (data.length === 0) {
      throw new NotFoundException("Conversation not found");
    }
  }

  public async getMessagesForUser(
    conversationId: string,
    userId: string,
  ): Promise<StoredMessage[]> {
    await this.getConversation(conversationId, userId);
    return this.getMessages(conversationId);
  }

  public async getMessages(conversationId: string): Promise<StoredMessage[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(config.chat.maxHistoryMessages);

    if (error) {
      this.logger.error(`Failed to fetch messages: ${error.message}`);
      throw error;
    }

    return (data as StoredMessage[] | null) ?? [];
  }

  private getClient(): SupabaseClient {
    return this.supabaseService.getAdminClient();
  }
}
