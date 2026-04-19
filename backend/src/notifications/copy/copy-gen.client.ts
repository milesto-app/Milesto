// Thin LLM client for notification copy generation (M2.9.2).
//
// Built directly on the OpenAI SDK rather than reusing AiService because
// copy-gen needs:
//   - A tight per-call timeout (4 s vs AiService's 30 s) that lets the
//     retry ladder fit inside a 9 s wall-clock budget.
//   - Structured output via `response_format` JSON schema, so we can
//     trust the parser output in 99 % of cases rather than regex-carving
//     JSON out of free-form text.
//   - Per-class 429 / 5xx retry-once semantics with a fixed 1 s backoff,
//     separate from AiService's parse-retry logic.
//
// The orchestration (retry ladder + semantic validation) lives in
// copy-gen.service.ts. This module is responsible only for: issue a
// single chat-completion call, parse the result, classify the outcome.

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

import { config } from "../../config/app.config.js";
import type { CopyGenErrorCode } from "./validators.js";
import { COPY_GEN_ERROR_CODE } from "./validators.js";

export type ClientCallResult =
  | {
      readonly ok: true;
      readonly rawContent: string;
      readonly providerStatus: number | null;
      readonly latencyMs: number;
    }
  | {
      readonly ok: false;
      readonly errorCode: CopyGenErrorCode;
      readonly reason: string;
      readonly providerStatus: number | null;
      readonly latencyMs: number;
    };

export interface ClientCallOptions {
  readonly model: string;
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly jsonSchema: Readonly<Record<string, unknown>>;
  readonly jsonSchemaName: string;
}

const HTTP_STATUS = {
  OK: 200,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

const RETRYABLE_STATUS_CODES: readonly number[] = [
  HTTP_STATUS.RATE_LIMITED,
  HTTP_STATUS.SERVER_ERROR,
  HTTP_STATUS.BAD_GATEWAY,
  HTTP_STATUS.SERVICE_UNAVAILABLE,
  HTTP_STATUS.GATEWAY_TIMEOUT,
];

@Injectable()
export class CopyGenClient {
  private readonly logger = new Logger(CopyGenClient.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      baseURL: config.ai.baseUrl,
      apiKey: this.configService.getOrThrow<string>("OPENROUTER_API_KEY"),
    });
  }

  /**
   * Issue one chat-completion call with a 4 s timeout. On a retryable
   * error (429 / 5xx) back off once for 1 s and retry; other errors
   * fail immediately. Timeout always fails immediately — the retry
   * ladder one level up can reissue with the strict prompt if budget
   * remains.
   */
  public async call(options: ClientCallOptions): Promise<ClientCallResult> {
    const first = await this.callOnce(options);
    if (first.ok) {
      return first;
    }
    if (!this.shouldBackoffAndRetry(first)) {
      return first;
    }
    await delay(config.copyGen.retryBackoffMs);
    return this.callOnce(options);
  }

  private shouldBackoffAndRetry(result: ClientCallResult): boolean {
    if (result.ok) {
      return false;
    }
    if (
      result.errorCode === COPY_GEN_ERROR_CODE.RATE_LIMITED ||
      result.errorCode === COPY_GEN_ERROR_CODE.PROVIDER_ERROR
    ) {
      return true;
    }
    return false;
  }

  private async callOnce(
    options: ClientCallOptions,
  ): Promise<ClientCallResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, config.copyGen.perCallTimeoutMs);
    const startedAt = Date.now();

    try {
      const response = await this.openai.chat.completions.create(
        {
          model: options.model,
          messages: [
            { role: "system", content: options.systemPrompt },
            { role: "user", content: options.userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: options.jsonSchemaName,
              strict: true,
              schema: options.jsonSchema,
            },
          },
        } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
        { signal: controller.signal },
      );
      const rawContent = response.choices[0]?.message.content ?? "";
      return {
        ok: true,
        rawContent,
        providerStatus: HTTP_STATUS.OK,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return this.classifyError(error, startedAt);
    } finally {
      clearTimeout(timeout);
    }
  }

  private classifyError(error: unknown, startedAt: number): ClientCallResult {
    const latencyMs = Date.now() - startedAt;

    if (isAbortError(error)) {
      return {
        ok: false,
        errorCode: COPY_GEN_ERROR_CODE.TIMEOUT,
        reason: "Per-call timeout exceeded.",
        providerStatus: null,
        latencyMs,
      };
    }

    if (error instanceof OpenAI.APIError) {
      const rawStatus: unknown = error.status;
      const status: number | null =
        typeof rawStatus === "number" ? rawStatus : null;
      if (status === HTTP_STATUS.RATE_LIMITED) {
        return {
          ok: false,
          errorCode: COPY_GEN_ERROR_CODE.RATE_LIMITED,
          reason: `Provider returned ${HTTP_STATUS.RATE_LIMITED}: ${error.message}`,
          providerStatus: status,
          latencyMs,
        };
      }
      if (status !== null && RETRYABLE_STATUS_CODES.includes(status)) {
        return {
          ok: false,
          errorCode: COPY_GEN_ERROR_CODE.PROVIDER_ERROR,
          reason: `Provider returned ${status}: ${error.message}`,
          providerStatus: status,
          latencyMs,
        };
      }
      return {
        ok: false,
        errorCode: COPY_GEN_ERROR_CODE.HTTP_ERROR,
        reason: `Provider returned ${status ?? "unknown"}: ${error.message}`,
        providerStatus: status,
        latencyMs,
      };
    }

    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Copy-gen client error (non-APIError): ${message}`);
    return {
      ok: false,
      errorCode: COPY_GEN_ERROR_CODE.HTTP_ERROR,
      reason: message,
      providerStatus: null,
      latencyMs,
    };
  }
}

function isAbortError(error: unknown): boolean {
  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }
  if (error instanceof OpenAI.APIUserAbortError) {
    return true;
  }
  return false;
}

async function delay(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
