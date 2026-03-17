import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as jose from 'jose';

import { SupabaseService } from '../supabase/supabase.service.js';

const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

const VALID_PRODUCT_IDS = new Set(['6759965333', '6759965329']);

interface DecodedTransaction {
  originalTransactionId: string;
  productId: string;
  expiresDate?: number;
}

interface AppleNotificationPayload {
  signedPayload?: string;
}

interface DecodedNotification {
  notificationType: string;
  data: {
    signedTransactionInfo: string;
  };
}

type SubscriptionStatus = 'active' | 'expired' | 'revoked' | 'billing_retry';

const NOTIFICATION_STATUS_MAP: Record<string, SubscriptionStatus> = {
  DID_RENEW: 'active',
  SUBSCRIBED: 'active',
  EXPIRED: 'expired',
  GRACE_PERIOD_EXPIRED: 'expired',
  REVOKE: 'revoked',
  REFUND: 'revoked',
  DID_FAIL_TO_RENEW: 'billing_retry',
};

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly jwks: ReturnType<typeof jose.createRemoteJWKSet>;

  constructor(private readonly supabaseService: SupabaseService) {
    this.jwks = jose.createRemoteJWKSet(new URL(APPLE_JWKS_URL));
  }

  public async verifyAndSync(
    userId: string,
    jwsTransaction: string,
  ): Promise<void> {
    const transaction =
      await this.verifyJws<DecodedTransaction>(jwsTransaction);

    if (!VALID_PRODUCT_IDS.has(transaction.productId)) {
      this.logger.warn(
        `Rejected subscription verify for user ${userId}: unknown productId=${transaction.productId}`,
      );
      throw new UnauthorizedException('Invalid product');
    }

    const expiresAt =
      transaction.expiresDate !== undefined
        ? new Date(transaction.expiresDate).toISOString()
        : null;

    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_expires_at: expiresAt,
        subscription_product_id: transaction.productId,
        subscription_original_transaction_id: transaction.originalTransactionId,
        subscription_verified_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      this.logger.error(
        `Failed to sync subscription for user ${userId}: ${error.message}`,
      );
      throw error;
    }

    this.logger.log(
      `Subscription synced for user ${userId}: product=${transaction.productId}, expires=${expiresAt ?? 'unknown'}`,
    );
  }

  public async handleWebhook(body: unknown): Promise<void> {
    const payload = body as AppleNotificationPayload;
    if (payload.signedPayload === undefined || payload.signedPayload === '') {
      throw new UnauthorizedException('Missing signed payload');
    }

    const notification = await this.verifyJws<DecodedNotification>(
      payload.signedPayload,
    );

    const status = NOTIFICATION_STATUS_MAP[notification.notificationType];
    if (status === undefined) {
      this.logger.log(
        `Ignoring Apple notification type: ${notification.notificationType}`,
      );
      return;
    }

    const transaction = await this.verifyJws<DecodedTransaction>(
      notification.data.signedTransactionInfo,
    );

    const supabase = this.supabaseService.getAdminClient();
    const { data: profile, error: lookupError } = await supabase
      .from('profiles')
      .select('id, subscription_verified_at')
      .eq(
        'subscription_original_transaction_id',
        transaction.originalTransactionId,
      )
      .single();

    if (lookupError) {
      this.logger.warn(
        `No profile found for originalTransactionId=${transaction.originalTransactionId}. Will sync on next app launch.`,
      );
      return;
    }

    const expiresAt =
      transaction.expiresDate !== undefined
        ? new Date(transaction.expiresDate).toISOString()
        : null;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_status: status,
        subscription_expires_at: expiresAt,
        subscription_verified_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (updateError) {
      this.logger.error(
        `Failed to update subscription via webhook for user ${profile.id}: ${updateError.message}`,
      );
      return;
    }

    this.logger.log(
      `Webhook updated subscription for user ${profile.id}: status=${status}`,
    );
  }

  private async verifyJws<T>(jws: string): Promise<T> {
    try {
      const { payload } = await jose.jwtVerify(jws, this.jwks, {
        issuer: 'https://appleid.apple.com',
      });
      return payload as unknown as T;
    } catch (error) {
      this.logger.error(
        `JWS verification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new UnauthorizedException('Invalid JWS token');
    }
  }
}
