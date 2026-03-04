import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import type { Stream } from 'openai/streaming';

import { appConfig } from '../config/app.config.js';

const DEFAULT_MAX_RETRIES = 3;

export interface GenerateJsonOptions {
  temperature?: number;
  timeoutMs?: number;
  reasoning?: { effort?: string };
  captureUsage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  maxRetries?: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      baseURL: appConfig.ai.baseUrl,
      apiKey: this.configService.getOrThrow<string>('OPENROUTER_API_KEY'),
    });
  }

  public async generateStream(
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[],
  ): Promise<Stream<ChatCompletionChunk>> {
    return this.openai.chat.completions.create({
      model: appConfig.chat.model,
      messages,
      tools,
      stream: true,
    });
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    return this.withTimeout(async (signal) => {
      try {
        const response = await this.openai.embeddings.create(
          {
            model: appConfig.ai.embeddingModel,
            input: text,
            dimensions: appConfig.ai.embeddingDimensions,
          },
          { signal },
        );

        const embedding = response.data[0]?.embedding;
        if (embedding === undefined) {
          throw new Error('No embedding data returned from AI');
        }

        this.logger.log(`Embedding generated: ${embedding.length} dimensions`);
        return embedding;
      } catch (error) {
        this.logger.error(
          `Embedding generation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        throw error;
      }
    });
  }

  public async generateJson<T>(
    system: string,
    user: string,
    model?: string,
    options?: GenerateJsonOptions,
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
    const timeoutMs = options?.timeoutMs ?? appConfig.ai.callTimeoutMs;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.withTimeout(async (signal) => {
          const response = await this.openai.chat.completions.create(
            {
              model: model ?? appConfig.ai.defaultModel,
              messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
              ],
            } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
            { signal },
          );
          this.captureUsage(options, response);
          return this.extractJson(response) as T;
        }, timeoutMs);
      } catch (error) {
        const isLastAttempt = attempt >= maxRetries;
        if (!this.isRetryableError(error) || isLastAttempt) {
          throw error;
        }
        this.logRetryWarning(attempt, maxRetries, error);
      }
    }
    throw new Error('All retry attempts exhausted');
  }

  private extractJson(
    response: OpenAI.Chat.Completions.ChatCompletion,
  ): unknown {
    const content = response.choices[0]?.message.content ?? '';
    const match = content.match(/[[{][\s\S]*[}\]]/);
    if (match === null) {
      throw new Error('No JSON found in AI response');
    }
    return JSON.parse(match[0]) as unknown;
  }

  private captureUsage(
    options: GenerateJsonOptions | undefined,
    response: OpenAI.Chat.Completions.ChatCompletion,
  ): void {
    if (options?.captureUsage !== undefined && response.usage !== undefined) {
      options.captureUsage.prompt_tokens = response.usage.prompt_tokens;
      options.captureUsage.completion_tokens = response.usage.completion_tokens;
      options.captureUsage.total_tokens = response.usage.total_tokens;
    }
  }

  private isRetryableError(error: unknown): boolean {
    return (
      error instanceof SyntaxError ||
      (error instanceof Error &&
        error.message === 'No JSON found in AI response')
    );
  }

  private logRetryWarning(
    attempt: number,
    maxRetries: number,
    error: unknown,
  ): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(
      `JSON parse failed (attempt ${attempt}/${maxRetries}): ${message}. Retrying...`,
    );
  }

  private async withTimeout<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    timeoutMs: number = appConfig.ai.callTimeoutMs,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      return await operation(controller.signal);
    } finally {
      clearTimeout(timeout);
    }
  }
}
