import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { Stream } from 'openai/streaming';
import type {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import { appConfig } from '../config/app.config.js';

@Injectable()
export class ChatAiService {
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      baseURL: appConfig.ai.baseUrl,
      apiKey: this.configService.getOrThrow<string>('OPENROUTER_API_KEY'),
    });
  }

  public async createStream(
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
}
