import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';

import { config } from '../config/app.config.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { Conversation, StoredMessage } from './types/chat.types.js';

export interface StoreMessageInput {
  role: 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: unknown[] | null;
  tool_call_id?: string | null;
  tool_name?: string | null;
  source_type?: 'text' | 'voice';
  voice_session_id?: string;
  turn_index?: number;
  source_timestamp?: string;
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
      .from('conversations')
      .insert({ user_id: userId, goal_id: goalId })
      .select('*')
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
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single()) as {
      data: Conversation | null;
      error: { message: string } | null;
    };

    if (error) {
      throw new NotFoundException('Conversation not found');
    }

    return data as Conversation;
  }

  public async storeMessage(
    conversationId: string,
    message: StoreMessageInput,
  ): Promise<StoredMessage> {
    const supabase = this.getClient();
    const { data, error } = (await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: message.role,
        content: message.content ?? null,
        tool_calls: message.tool_calls ?? null,
        tool_call_id: message.tool_call_id ?? null,
        tool_name: message.tool_name ?? null,
        source_type: message.source_type ?? 'text',
        voice_session_id: message.voice_session_id ?? null,
        turn_index: message.turn_index ?? null,
        source_timestamp: message.source_timestamp ?? null,
      })
      .select('*')
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

  public async storeVoiceMessage(
    conversationId: string,
    message: StoreMessageInput,
  ): Promise<StoredMessage> {
    const supabase = this.getClient();
    const { data, error } = (await supabase
      .from('messages')
      .upsert(
        {
          conversation_id: conversationId,
          role: message.role,
          content: message.content ?? null,
          tool_calls: message.tool_calls ?? null,
          tool_call_id: message.tool_call_id ?? null,
          tool_name: message.tool_name ?? null,
          source_type: 'voice',
          voice_session_id: message.voice_session_id ?? null,
          turn_index: message.turn_index ?? null,
          source_timestamp: message.source_timestamp ?? null,
        },
        { onConflict: 'voice_session_id,turn_index', ignoreDuplicates: true },
      )
      .select('*')
      .single()) as {
      data: StoredMessage | null;
      error: { message: string } | null;
    };

    if (error) {
      this.logger.error(`Failed to upsert voice message: ${error.message}`);
      throw new Error(error.message);
    }

    return data as StoredMessage;
  }

  public async getMessages(conversationId: string): Promise<StoredMessage[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('effective_timestamp', { ascending: true })
      .limit(config.chat.maxHistoryMessages);

    if (error) {
      this.logger.error(`Failed to fetch messages: ${error.message}`);
      throw error;
    }

    return (data as StoredMessage[] | null) ?? [];
  }

  private getClient(): SupabaseClient {
    return this.supabaseService.getAdminClient() as unknown as SupabaseClient;
  }
}
