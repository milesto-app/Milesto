import type {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";

import type { ChatStreamEvent } from "./types/chat.types.js";
import type { StoredMessage } from "./types/chat.types.js";

export interface ToolCallResult {
  id: string;
  name: string;
  arguments: string;
}

export interface StreamResult {
  content: string;
  toolCalls: ToolCallResult[];
}

export async function consumeStream(
  stream: AsyncIterable<ChatCompletionChunk>,
  onEvent: (event: ChatStreamEvent) => void,
): Promise<StreamResult> {
  let content = "";
  const toolCallMap = new Map<number, ToolCallResult>();

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (delta === undefined) {
      continue;
    }

    if (delta.content !== undefined && delta.content !== null) {
      content += delta.content;
      onEvent({ type: "text_delta", delta: delta.content });
    }

    if (delta.tool_calls !== undefined) {
      for (const tc of delta.tool_calls) {
        accumulateToolCall(toolCallMap, tc);
      }
    }
  }

  return { content, toolCalls: [...toolCallMap.values()] };
}

function createToolCallEntry(
  tc: ChatCompletionChunk.Choice.Delta.ToolCall,
): ToolCallResult {
  return {
    id: tc.id ?? "",
    name: tc.function?.name ?? "",
    arguments: tc.function?.arguments ?? "",
  };
}

function mergeToolCallDelta(
  existing: ToolCallResult,
  tc: ChatCompletionChunk.Choice.Delta.ToolCall,
): void {
  if (tc.id !== undefined) {
    existing.id = tc.id;
  }
  if (tc.function?.name !== undefined) {
    existing.name += tc.function.name;
  }
  if (tc.function?.arguments !== undefined) {
    existing.arguments += tc.function.arguments;
  }
}

function accumulateToolCall(
  map: Map<number, ToolCallResult>,
  tc: ChatCompletionChunk.Choice.Delta.ToolCall,
): void {
  const existing = map.get(tc.index);
  if (existing === undefined) {
    map.set(tc.index, createToolCallEntry(tc));
    return;
  }

  mergeToolCallDelta(existing, tc);
}

function convertStoredMessage(msg: StoredMessage): ChatCompletionMessageParam {
  if (msg.role === "user") {
    return { role: "user", content: msg.content ?? "" };
  }

  if (msg.role === "tool") {
    return {
      role: "tool",
      tool_call_id: msg.tool_call_id ?? "",
      content: msg.content ?? "",
    };
  }

  if (msg.tool_calls !== null && msg.tool_calls.length > 0) {
    return {
      role: "assistant",
      content: msg.content ?? null,
      tool_calls: msg.tool_calls,
    };
  }

  return { role: "assistant", content: msg.content ?? "" };
}

export function toOpenAiMessages(
  systemPrompt: string,
  stored: StoredMessage[],
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of stored) {
    messages.push(convertStoredMessage(msg));
  }

  return messages;
}
