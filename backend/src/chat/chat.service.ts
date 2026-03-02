import { Injectable, Logger } from '@nestjs/common';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import { appConfig } from '../config/app.config.js';
import { ChatAiService } from './chat-ai.service.js';
import { ChatHistoryService } from './chat-history.service.js';
import { ChatPromptService } from './chat-prompt.service.js';
import { ChatToolsService } from './chat-tools.service.js';
import { buildToolRegistry } from './chat-tool-registry.js';
import { consumeStream, toOpenAiMessages } from './chat-stream.utils.js';
import type { SendMessageDto } from './dto/send-message.dto.js';
import type { ChatStreamEvent, ChatToolEntry, ToolExecutionContext } from './types/chat.types.js';
import type { ToolCallResult } from './chat-stream.utils.js';

interface AgentLoopOptions {
  messages: ChatCompletionMessageParam[];
  tools: ChatCompletionTool[];
  ctx: ToolExecutionContext;
  conversationId: string;
  onEvent: (event: ChatStreamEvent) => void;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly toolRegistry: Map<string, ChatToolEntry>;

  // eslint-disable-next-line max-params -- NestJS DI requires individual constructor params
  constructor(
    private readonly chatAi: ChatAiService,
    private readonly history: ChatHistoryService,
    private readonly prompt: ChatPromptService,
    private readonly toolsService: ChatToolsService,
  ) {
    this.toolRegistry = buildToolRegistry(this.toolsService);
  }

  public async handleMessage(
    userId: string,
    dto: SendMessageDto,
    onEvent: (event: ChatStreamEvent) => void,
  ): Promise<void> {
    const conversation =
      dto.conversationId !== undefined
        ? await this.history.getConversation(dto.conversationId, userId)
        : await this.history.createConversation(userId, dto.goalId);

    await this.history.storeMessage(conversation.id, { role: 'user', content: dto.content });
    const storedMessages = await this.history.getMessages(conversation.id);
    const coachId = await this.prompt.getUserCoachId(userId);
    const systemPrompt = await this.prompt.buildSystemPrompt(coachId);
    const messages = toOpenAiMessages(systemPrompt, storedMessages);
    const tools = [...this.toolRegistry.values()].map((entry) => entry.definition);

    onEvent({ type: 'message_start', conversationId: conversation.id });
    await this.runAgentLoop({
      messages,
      tools,
      ctx: { userId, goalId: dto.goalId },
      conversationId: conversation.id,
      onEvent,
    });
    onEvent({ type: 'message_end' });
  }

  private async runAgentLoop(opts: AgentLoopOptions): Promise<void> {
    for (let round = 0; round < appConfig.chat.maxToolRounds; round++) {
      // eslint-disable-next-line no-await-in-loop -- sequential agentic loop requires await
      const stream = await this.chatAi.createStream(opts.messages, opts.tools);
      // eslint-disable-next-line no-await-in-loop -- must consume before next round
      const { content, toolCalls } = await consumeStream(stream, opts.onEvent);

      if (toolCalls.length === 0) {
        // eslint-disable-next-line no-await-in-loop -- final store before return
        await this.history.storeMessage(opts.conversationId, { role: 'assistant', content });
        return;
      }

      // eslint-disable-next-line no-await-in-loop -- must store before tool execution
      await this.storeAssistantToolCalls(opts, content, toolCalls);
      // eslint-disable-next-line no-await-in-loop -- tool execution is sequential
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
      type: 'function' as const,
      function: { name: tc.name, arguments: tc.arguments },
    }));

    opts.messages.push({ role: 'assistant', content: content || null, tool_calls: formatted });
    await this.history.storeMessage(opts.conversationId, {
      role: 'assistant',
      content: content || null,
      tool_calls: formatted,
    });
  }

  private async executeToolCalls(
    opts: AgentLoopOptions,
    toolCalls: ToolCallResult[],
  ): Promise<void> {
    for (const tc of toolCalls) {
      opts.onEvent({ type: 'tool_start', toolName: tc.name });
      // eslint-disable-next-line no-await-in-loop -- tools must execute sequentially
      const result = await this.executeTool(tc.name, tc.arguments, opts.ctx);
      const resultStr = JSON.stringify(result);
      opts.messages.push({ role: 'tool', tool_call_id: tc.id, content: resultStr });
      // eslint-disable-next-line no-await-in-loop -- must store before next tool
      await this.history.storeMessage(opts.conversationId, {
        role: 'tool',
        content: resultStr,
        tool_call_id: tc.id,
        tool_name: tc.name,
      });
      opts.onEvent({ type: 'tool_end', toolName: tc.name });
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

    const parsed = args.length > 0 ? (JSON.parse(args) as Record<string, unknown>) : {};
    return entry.executor(parsed, ctx);
  }
}
