import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";

import { AiService } from "../ai/ai.service.js";
import { config } from "../config/app.config.js";
import { UsageService } from "../usage/usage.service.js";
import { GenerationType } from "../usage/usage.types.js";
import { ChatHistoryService } from "./chat-history.service.js";
import { ChatPromptService } from "./chat-prompt.service.js";
import type { ToolCallResult } from "./chat-stream.utils.js";
import { consumeStream, toOpenAiMessages } from "./chat-stream.utils.js";
import { ChatToolRegistryService } from "./chat-tool-registry.service.js";
import type { SendMessageDto } from "./dto/send-message.dto.js";
import type {
  ChatStreamEvent,
  ChatToolEntry,
  ToolExecutionContext,
} from "./types/chat.types.js";

interface AgentLoopOptions {
  messages: ChatCompletionMessageParam[];
  tools: ChatCompletionTool[];
  ctx: ToolExecutionContext;
  conversationId: string;
  userId: string;
  goalId: string;
  onEvent: (event: ChatStreamEvent) => void;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly toolRegistry: Map<string, ChatToolEntry>;

  constructor(
    private readonly ai: AiService,
    private readonly history: ChatHistoryService,
    private readonly prompt: ChatPromptService,
    private readonly toolRegistryService: ChatToolRegistryService,
    private readonly usageService: UsageService,
    private readonly events: EventEmitter2,
  ) {
    this.toolRegistry = this.toolRegistryService.getRegistry();
  }

  public async handleMessage(
    userId: string,
    dto: SendMessageDto,
    onEvent: (event: ChatStreamEvent) => void,
  ): Promise<void> {
    await this.usageService.reserveGeneration(
      userId,
      GenerationType.CHAT_MESSAGE,
    );
    const conversation =
      dto.conversationId !== undefined
        ? await this.history.getConversation(dto.conversationId, userId)
        : await this.history.createConversation(userId, dto.goalId);

    await this.history.storeMessage(conversation.id, {
      role: "user",
      content: dto.content,
    });
    const storedMessages = await this.history.getMessages(conversation.id);
    const [{ coachId, language }, goalContext, memory] = await Promise.all([
      this.prompt.getUserProfile(userId),
      this.prompt.fetchGoalContext(dto.goalId, userId),
      this.prompt.fetchMemory(userId, dto.goalId),
    ]);
    const systemPrompt = this.prompt.buildSystemPrompt({
      coachId,
      goalContext,
      language,
      memory,
    });
    const messages = toOpenAiMessages(systemPrompt, storedMessages);
    const tools = [...this.toolRegistry.values()].map(
      (entry) => entry.definition,
    );

    onEvent({ type: "message_start", conversationId: conversation.id });
    await this.runAgentLoop({
      messages,
      tools,
      ctx: { userId, goalId: dto.goalId },
      conversationId: conversation.id,
      userId,
      goalId: dto.goalId,
      onEvent,
    });
    onEvent({ type: "message_end" });
  }

  private async runAgentLoop(opts: AgentLoopOptions): Promise<void> {
    for (let round = 0; round < config.chat.maxToolRounds; round++) {
      const stream = await this.ai.generateStream(
        opts.messages,
        opts.tools,
        config.chat.reasoningEffort,
      );
      const { content, toolCalls } = await consumeStream(stream, opts.onEvent);

      if (toolCalls.length === 0) {
        const stored = await this.history.storeMessage(opts.conversationId, {
          role: "assistant",
          content,
        });
        this.events.emit("coach.reply.ready", {
          userId: opts.userId,
          goalId: opts.goalId,
          conversationId: opts.conversationId,
          messageId: stored.id,
          content,
        });
        return;
      }

      await this.storeAssistantToolCalls(opts, content, toolCalls);
      await this.executeToolCalls(opts, toolCalls);
    }
  }

  private async storeAssistantToolCalls(
    opts: AgentLoopOptions,
    content: string,
    toolCalls: ToolCallResult[],
  ): Promise<void> {
    const formatted = toolCalls.map((tc) => ({
      id: tc.id,
      type: "function" as const,
      function: { name: tc.name, arguments: tc.arguments },
    }));

    opts.messages.push({
      role: "assistant",
      content: content || null,
      tool_calls: formatted,
    });
    await this.history.storeMessage(opts.conversationId, {
      role: "assistant",
      content: content || null,
      tool_calls: formatted,
    });
  }

  private async executeToolCalls(
    opts: AgentLoopOptions,
    toolCalls: ToolCallResult[],
  ): Promise<void> {
    for (const tc of toolCalls) {
      opts.onEvent({ type: "tool_start", toolName: tc.name });
      const result = await this.executeTool(tc.name, tc.arguments, opts.ctx);
      const resultStr = JSON.stringify(result);
      opts.messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: resultStr,
      });
      await this.history.storeMessage(opts.conversationId, {
        role: "tool",
        content: resultStr,
        tool_call_id: tc.id,
        tool_name: tc.name,
      });
      opts.onEvent({ type: "tool_end", toolName: tc.name });
    }
  }

  private async executeTool(
    name: string,
    args: string,
    ctx: ToolExecutionContext,
  ): Promise<unknown> {
    const entry = this.toolRegistry.get(name);
    if (entry === undefined) {
      this.logger.warn(`Unknown tool requested: ${name}`);
      return { error: `Unknown tool: ${name}` };
    }

    const parsed =
      args.length > 0 ? (JSON.parse(args) as Record<string, unknown>) : {};
    return entry.executor(parsed, ctx);
  }
}
