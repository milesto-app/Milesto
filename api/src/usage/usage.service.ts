import {
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { HttpException } from "@nestjs/common";

import { config } from "../config/app.config.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import { SubscriptionRequiredException } from "./subscription-required.exception.js";
import { isProSubscriptionStatus } from "./subscription-state.js";
import type {
  GenerationType,
  ReservationResult,
  UsageStatus,
} from "./usage.types.js";

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async reserveGeneration(
    userId: string,
    type: GenerationType,
  ): Promise<ReservationResult> {
    const supabase = this.supabaseService.getAdminClient();
    await this.assertActiveSubscription(userId);

    const { data, error } = await supabase.rpc("reserve_generation", {
      p_user_id: userId,
      p_type: type,
      p_free_limit: config.usage.freeGenerationsPerDay,
      p_pro_limit: config.usage.proGenerationsPerDay,
    });

    if (error) {
      this.logger.error(`Usage reservation failed: ${error.message}`);
      throw new InternalServerErrorException("Usage check failed");
    }

    const result = data as unknown as ReservationResult;
    if (!result.granted) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: "GENERATION_LIMIT_REACHED",
          message: "Daily generation limit reached",
          usage: {
            used: result.used,
            limit: result.limit,
            isPro: result.is_pro,
            resetsAt: this.getNextResetTime(),
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return result;
  }

  /**
   * Backfill token usage onto the most recent `generation_usage` row inserted
   * for `(userId, type)` today. The row itself is created up-front by the
   * `reserve_generation` RPC inside `reserveGeneration()`; we update it after
   * the LLM call resolves so that the admin cost-estimate endpoint can price
   * usage by model. If the call site has no token info (e.g. embeddings,
   * transcription), the third arg is omitted and we simply do nothing.
   *
   * Failures are logged but never rethrown — token bookkeeping must not crash
   * a successful user-facing generation.
   */
  public async record(
    userId: string,
    type: GenerationType,
    tokens?: {
      promptTokens?: number | undefined;
      completionTokens?: number | undefined;
      model?: string | undefined;
    },
  ): Promise<void> {
    if (!hasTokenInfo(tokens)) {
      return;
    }
    const rowId = await this.findLatestUsageRowId(userId, type);
    if (rowId === null) {
      return;
    }
    await this.updateUsageTokens(rowId, tokens);
  }

  private async findLatestUsageRowId(
    userId: string,
    type: GenerationType,
  ): Promise<string | null> {
    const supabase = this.supabaseService.getAdminClient();
    const today = new Date().toISOString().split("T")[0] ?? "";
    const { data, error } = await supabase
      .from("generation_usage")
      .select("id")
      .eq("user_id", userId)
      .eq("generation_type", type)
      .eq("usage_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      this.logger.warn(
        `Failed to find usage row to record tokens: ${error.message}`,
      );
      return null;
    }
    return data?.id ?? null;
  }

  private async updateUsageTokens(
    rowId: string,
    tokens: {
      promptTokens?: number | undefined;
      completionTokens?: number | undefined;
      model?: string | undefined;
    },
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("generation_usage")
      .update({
        prompt_tokens: tokens.promptTokens ?? null,
        completion_tokens: tokens.completionTokens ?? null,
        model: tokens.model ?? null,
      })
      .eq("id", rowId);

    if (error) {
      this.logger.warn(
        `Failed to record token usage on row ${rowId}: ${error.message}`,
      );
    }
  }

  public async getUsage(userId: string): Promise<UsageStatus> {
    const supabase = this.supabaseService.getAdminClient();
    const today = new Date().toISOString().split("T")[0] ?? "";

    const [profileResult, countResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("subscription_status, subscription_expires_at")
        .eq("id", userId)
        .single(),
      supabase
        .from("generation_usage")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("usage_date", today),
    ]);

    if (profileResult.error) {
      this.logger.error(
        `Failed to fetch profile for usage: ${profileResult.error.message}`,
      );
      throw new InternalServerErrorException("Failed to fetch usage");
    }

    const isPro =
      isProSubscriptionStatus(profileResult.data.subscription_status) &&
      profileResult.data.subscription_expires_at !== null &&
      new Date(profileResult.data.subscription_expires_at) > new Date();

    const limit = isPro
      ? config.usage.proGenerationsPerDay
      : config.usage.freeGenerationsPerDay;

    return {
      used: countResult.count ?? 0,
      limit,
      isPro,
      resetsAt: this.getNextResetTime(),
    };
  }

  private async assertActiveSubscription(userId: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("subscription_status, subscription_expires_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `Failed to fetch subscription for usage: ${error.message}`,
      );
      throw new InternalServerErrorException("Usage check failed");
    }

    const expiresAt = data?.subscription_expires_at;
    const isSubscribed =
      isProSubscriptionStatus(data?.subscription_status) &&
      expiresAt !== null &&
      expiresAt !== undefined &&
      new Date(expiresAt) > new Date();

    if (!isSubscribed) {
      throw new SubscriptionRequiredException();
    }
  }

  private getNextResetTime(): string {
    const now = new Date();
    const tomorrow = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    );
    return tomorrow.toISOString();
  }
}

function hasTokenInfo(
  tokens:
    | {
        promptTokens?: number | undefined;
        completionTokens?: number | undefined;
        model?: string | undefined;
      }
    | undefined,
): tokens is {
  promptTokens?: number | undefined;
  completionTokens?: number | undefined;
  model?: string | undefined;
} {
  if (tokens === undefined) {
    return false;
  }
  return (
    tokens.promptTokens !== undefined ||
    tokens.completionTokens !== undefined ||
    tokens.model !== undefined
  );
}
