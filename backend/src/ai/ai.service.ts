import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

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

  public async generateEmbedding(text: string): Promise<number[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, appConfig.ai.callTimeoutMs);

    try {
      const response = await this.openai.embeddings.create(
        {
          model: appConfig.ai.embeddingModel,
          input: text,
          dimensions: appConfig.ai.embeddingDimensions,
        },
        { signal: controller.signal },
      );

      const embedding = response.data[0]?.embedding;
      if (embedding === undefined) {
        throw new Error('No embedding data returned from AI');
      }
      this.logger.log(`Embedding generated: ${embedding.length} dimensions`);
      return embedding;
    } catch (error) {
      this.logger.error(
        `Embedding generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  // eslint-disable-next-line max-params -- public API used across many modules
  public async generateJSON<T>(
    system: string,
    user: string,
    model?: string,
    options?: GenerateJsonOptions,
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
    let lastError: Error = new Error('No attempts made');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop -- sequential retry loop requires await
        return await this.attemptJsonGeneration<T>(
          system,
          user,
          model,
          options,
        );
      } catch (error) {
        if (!this.shouldRetry(error) || attempt >= maxRetries) {
          throw error;
        }
        this.logger.warn(
          `JSON parse failed (attempt ${attempt}/${maxRetries}): ${error instanceof Error ? error.message : String(error)}. Retrying...`,
        );
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    throw lastError;
  }

  private shouldRetry(error: unknown): boolean {
    return (
      error instanceof SyntaxError ||
      (error instanceof Error &&
        error.message === 'No JSON found in AI response')
    );
  }

  // eslint-disable-next-line max-params -- mirrors public generateJSON signature
  private async attemptJsonGeneration<T>(
    system: string,
    user: string,
    model: string | undefined,
    options: GenerateJsonOptions | undefined,
  ): Promise<T> {
    const timeoutMs = options?.timeoutMs ?? appConfig.ai.callTimeoutMs;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await this.callChatCompletion(
        system,
        user,
        model,
        controller.signal,
      );
      this.captureUsageIfNeeded(options, response);
      return this.extractJsonFromResponse(response) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  // eslint-disable-next-line max-params -- pass-through to OpenAI SDK
  private async callChatCompletion(
    system: string,
    user: string,
    model: string | undefined,
    signal: AbortSignal,
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    return this.openai.chat.completions.create(
      {
        model: model ?? appConfig.ai.defaultModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
      { signal },
    );
  }

  private extractJsonFromResponse(
    response: OpenAI.Chat.Completions.ChatCompletion,
  ): unknown {
    const content = response.choices[0]?.message.content ?? '';
    const match = content.match(/[[{][\s\S]*[}\]]/);
    if (match === null) {
      throw new Error('No JSON found in AI response');
    }
    return JSON.parse(match[0]) as unknown;
  }

  private captureUsageIfNeeded(
    options: GenerateJsonOptions | undefined,
    response: OpenAI.Chat.Completions.ChatCompletion,
  ): void {
    if (options?.captureUsage !== undefined && response.usage !== undefined) {
      options.captureUsage.prompt_tokens = response.usage.prompt_tokens;
      options.captureUsage.completion_tokens = response.usage.completion_tokens;
      options.captureUsage.total_tokens = response.usage.total_tokens;
    }
  }
}
