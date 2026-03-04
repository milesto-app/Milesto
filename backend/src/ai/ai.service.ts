import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import type { Stream } from 'openai/streaming';

import { config } from '../config/app.config.js';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      baseURL: config.ai.baseUrl,
      apiKey: this.configService.getOrThrow<string>('OPENROUTER_API_KEY'),
    });
  }

  public async generateStream(
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[],
  ): Promise<Stream<ChatCompletionChunk>> {
    return this.openai.chat.completions.create({
      model: config.chat.model,
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
            model: config.ai.embeddingModel,
            input: text,
            dimensions: config.ai.embeddingDimensions,
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
    reasoning?: string,
  ): Promise<T> {
    for (let attempt = 1; attempt <= config.ai.maxRetries; attempt++) {
      try {
        return await this.withTimeout(async (signal) => {
          const response = await this.openai.chat.completions.create(
            {
              model: model ?? config.ai.defaultModel,
              messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
              ],
              ...(reasoning !== undefined && {
                reasoning: { effort: reasoning },
              }),
            } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
            { signal },
          );
          return this.extractJson(response) as T;
        });
      } catch (error) {
        const isLastAttempt = attempt >= config.ai.maxRetries;
        if (!this.isRetryableError(error) || isLastAttempt) {
          throw error;
        }
        this.logRetryWarning(attempt, error);
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

  private isRetryableError(error: unknown): boolean {
    return (
      error instanceof SyntaxError ||
      (error instanceof Error &&
        error.message === 'No JSON found in AI response')
    );
  }

  private logRetryWarning(attempt: number, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(
      `JSON parse failed (attempt ${attempt}/${config.ai.maxRetries}): ${message}. Retrying...`,
    );
  }

  private async withTimeout<T>(
    operation: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, config.ai.callTimeoutMs);

    try {
      return await operation(controller.signal);
    } finally {
      clearTimeout(timeout);
    }
  }
}
