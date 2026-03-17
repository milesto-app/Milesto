import {
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpException } from '@nestjs/common';

import { config } from '../config/app.config.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type {
  GenerationType,
  ReservationResult,
  UsageStatus,
} from './usage.types.js';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async reserveGeneration(
    userId: string,
    type: GenerationType,
  ): Promise<ReservationResult> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase.rpc('reserve_generation', {
      p_user_id: userId,
      p_type: type,
      p_free_limit: config.usage.freeGenerationsPerDay,
      p_pro_limit: config.usage.proGenerationsPerDay,
    });

    if (error) {
      this.logger.error(`Usage reservation failed: ${error.message}`);
      throw new InternalServerErrorException('Usage check failed');
    }

    const result = data as unknown as ReservationResult;
    if (!result.granted) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'GENERATION_LIMIT_REACHED',
          message: 'Daily generation limit reached',
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

  public async getUsage(userId: string): Promise<UsageStatus> {
    const supabase = this.supabaseService.getAdminClient();
    const today = new Date().toISOString().split('T')[0] ?? '';

    const [profileResult, countResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('subscription_status, subscription_expires_at')
        .eq('id', userId)
        .single(),
      supabase
        .from('generation_usage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('usage_date', today),
    ]);

    if (profileResult.error) {
      this.logger.error(
        `Failed to fetch profile for usage: ${profileResult.error.message}`,
      );
      throw new InternalServerErrorException('Failed to fetch usage');
    }

    const isPro =
      profileResult.data.subscription_status === 'active' &&
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

  private getNextResetTime(): string {
    const now = new Date();
    const tomorrow = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    );
    return tomorrow.toISOString();
  }
}
