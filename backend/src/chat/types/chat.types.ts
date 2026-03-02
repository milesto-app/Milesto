import type OpenAI from 'openai';

export interface Conversation {
  id: string;
  user_id: string;
  goal_id: string;
  created_at: string;
  updated_at: string;
}

export interface StoredMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] | null;
  tool_call_id: string | null;
  tool_name: string | null;
  created_at: string;
}

export type ChatStreamEvent =
  | { type: 'message_start'; conversationId: string }
  | { type: 'tool_start'; toolName: string }
  | { type: 'tool_end'; toolName: string }
  | { type: 'text_delta'; delta: string }
  | { type: 'message_end' }
  | { type: 'error'; message: string };

export type ChatToolExecutor = (
  args: Record<string, unknown>,
  context: ToolExecutionContext,
) => Promise<unknown>;

export interface ChatToolEntry {
  definition: OpenAI.Chat.Completions.ChatCompletionTool;
  executor: ChatToolExecutor;
}

export interface ToolExecutionContext {
  userId: string;
  goalId: string;
}
