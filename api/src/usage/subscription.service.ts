import {
  SignedDataVerifier,
  VerificationException,
  VerificationStatus,
} from "@apple/app-store-server-library/dist/jws_verification.js";
import { Environment } from "@apple/app-store-server-library/dist/models/Environment.js";
import type { JWSRenewalInfoDecodedPayload } from "@apple/app-store-server-library/dist/models/JWSRenewalInfoDecodedPayload.js";
import type { JWSTransactionDecodedPayload } from "@apple/app-store-server-library/dist/models/JWSTransactionDecodedPayload.js";
import type { ResponseBodyV2DecodedPayload } from "@apple/app-store-server-library/dist/models/ResponseBodyV2DecodedPayload.js";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";

import { config } from "../config/app.config.js";
import type { TablesUpdate } from "../supabase/database.types.js";
import { SUPABASE_NOT_FOUND } from "../supabase/error-codes.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import { loadAppleRootCertificates } from "./apple-root-certs.js";
import { ProcessedNotificationsService } from "./processed-notifications.service.js";
import {
  deriveSubscriptionUpdate,
  SUBSCRIPTION_STATUS,
  type SubscriptionStatus,
  type SubscriptionUpdate,
} from "./subscription-state.js";

const TYPE_AUTO_RENEWABLE = "Auto-Renewable Subscription";
const OWNERSHIP_FAMILY_SHARED = "FAMILY_SHARED";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SubscriptionStatusResponse {
  status: string;
  expiresAt: string | null;
  productId: string | null;
  autoRenew: boolean | null;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly primaryVerifier: SignedDataVerifier;
  private readonly sandboxFallbackVerifier: SignedDataVerifier | null;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly processedNotifications: ProcessedNotificationsService,
  ) {
    const rootCerts = loadAppleRootCertificates(config.apple.rootCaDir);
    const environment = this.parseEnvironment(config.apple.environment);

    this.primaryVerifier = new SignedDataVerifier(
      rootCerts,
      true,
      environment,
      config.apple.bundleId,
      environment === Environment.PRODUCTION
        ? config.apple.appAppleId
        : undefined,
    );

    this.sandboxFallbackVerifier =
      environment === Environment.PRODUCTION
        ? new SignedDataVerifier(
            rootCerts,
            true,
            Environment.SANDBOX,
            config.apple.bundleId,
          )
        : null;
  }

  public async verifyAndSync(userId: string, jws: string): Promise<void> {
    const transaction = await this.verifyTransactionWithFallback(jws);
    this.assertTransactionClaims(transaction);
    this.assertAppAccountToken(transaction.appAccountToken, userId);

    await this.assertOriginalTransactionNotOwnedByOther(
      transaction.originalTransactionId,
      userId,
    );

    const signedDateIso = this.toIsoOrNull(transaction.signedDate);
    const status = this.deriveStatusFromTransaction(transaction);
    const expiresAt = this.toIsoOrNull(transaction.expiresDate);

    const didApply = await this.applyProfilePatchIfFresh(
      userId,
      {
        subscription_status: status,
        subscription_expires_at: expiresAt,
        subscription_product_id: transaction.productId ?? null,
        subscription_original_transaction_id:
          transaction.originalTransactionId ?? null,
        subscription_verified_at: new Date().toISOString(),
        subscription_apple_signed_at: signedDateIso,
        subscription_environment: this.stringOrNull(transaction.environment),
      },
      signedDateIso,
    );
    if (!didApply) {
      this.logger.debug(
        `Stale verify for user=${userId} tx=${transaction.transactionId ?? "unknown"} — no-op`,
      );
      return;
    }

    this.logger.log(
      `Subscription synced user=${userId} status=${status} product=${transaction.productId ?? "unknown"}`,
    );
  }

  public async handleWebhook(signedPayload: string): Promise<void> {
    if (typeof signedPayload !== "string" || signedPayload === "") {
      throw new BadRequestException("Missing signedPayload");
    }

    const notification =
      await this.verifyNotificationWithFallback(signedPayload);
    const notificationUuid = notification.notificationUUID;
    if (notificationUuid === undefined || notificationUuid === "") {
      throw new BadRequestException("Missing notificationUUID");
    }

    const type = this.stringOrNull(notification.notificationType) ?? "UNKNOWN";
    const subtype = this.stringOrNull(notification.subtype);

    const isAlreadyProcessed =
      await this.processedNotifications.isProcessed(notificationUuid);
    if (isAlreadyProcessed) {
      this.logger.debug(`Dedupe hit for notificationUUID=${notificationUuid}`);
      return;
    }

    await this.processWebhookAfterDedupe(notification, type, subtype);

    // Mark processed only after the state update succeeds. If processing threw,
    // this line is skipped and Apple will retry. Concurrent deliveries of the
    // same UUID are safe: both process, but the profile UPDATE is idempotent
    // under signedDate monotonicity, and the PK on notification_uuid ensures
    // only the first INSERT wins.
    await this.processedNotifications.markProcessed(
      notificationUuid,
      type,
      subtype,
    );
  }

  private async processWebhookAfterDedupe(
    notification: ResponseBodyV2DecodedPayload,
    type: string,
    subtype: string | null,
  ): Promise<void> {
    const signedTx = notification.data?.signedTransactionInfo;
    if (signedTx === undefined || signedTx === "") {
      this.logger.warn(
        `Notification ${notification.notificationUUID ?? "unknown"} (${type}) has no signedTransactionInfo — ignoring`,
      );
      return;
    }

    const transaction = await this.verifyTransactionWithFallback(signedTx);
    const renewalInfo = await this.maybeVerifyRenewalInfo(
      notification.data?.signedRenewalInfo,
    );

    const update = deriveSubscriptionUpdate(
      notification,
      transaction,
      renewalInfo,
    );
    if (update === null) {
      const subtypeSuffix = subtype === null ? "" : `:${subtype}`;
      this.logger.log(`Ignoring notification type=${type}${subtypeSuffix}`);
      return;
    }

    await this.applyWebhookIfFresh(notification, transaction, update, type);
  }

  private async maybeVerifyRenewalInfo(
    signedRenewalInfo: string | undefined,
  ): Promise<JWSRenewalInfoDecodedPayload | null> {
    if (signedRenewalInfo === undefined || signedRenewalInfo === "") {
      return null;
    }
    return this.verifyRenewalInfoWithFallback(signedRenewalInfo);
  }

  private async applyWebhookIfFresh(
    notification: ResponseBodyV2DecodedPayload,
    transaction: JWSTransactionDecodedPayload,
    update: SubscriptionUpdate,
    type: string,
  ): Promise<void> {
    const userId = await this.findUserIdForWebhook(transaction);
    if (userId === null) {
      this.logger.warn(
        `No user for transaction originalTx=${transaction.originalTransactionId ?? "unknown"} appAccountToken=${transaction.appAccountToken ?? "unknown"} — foreign/late notification`,
      );
      return;
    }

    const signedDateIso = this.toIsoOrNull(
      notification.signedDate ?? transaction.signedDate,
    );
    const didApply = await this.applyWebhookUpdate(
      userId,
      transaction,
      update,
      signedDateIso,
    );
    if (!didApply) {
      this.logger.debug(
        `Stale webhook for user=${userId} tx=${transaction.transactionId ?? "unknown"} type=${type} — no-op`,
      );
    }
  }

  public async getStatus(userId: string): Promise<SubscriptionStatusResponse> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "subscription_status, subscription_expires_at, subscription_product_id, subscription_auto_renew_status",
      )
      .eq("id", userId)
      .maybeSingle();

    if (error && error.code !== SUPABASE_NOT_FOUND) {
      this.logger.error(
        `Failed to fetch subscription status user=${userId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        "Failed to fetch subscription status",
      );
    }

    if (!data) {
      return {
        status: SUBSCRIPTION_STATUS.UNKNOWN,
        expiresAt: null,
        productId: null,
        autoRenew: null,
      };
    }

    return {
      status: this.deriveEffectiveStatus(
        data.subscription_status,
        data.subscription_expires_at,
      ),
      expiresAt: data.subscription_expires_at,
      productId: data.subscription_product_id,
      autoRenew: data.subscription_auto_renew_status,
    };
  }

  // Mirrors `UsageService.assertActiveSubscription` — an "active"/"grace_period"
  // row whose `expires_at` has passed must surface as expired so clients (and
  // the gating endpoints) agree. The stored status can lag when Apple's
  // EXPIRED notification is delayed or missed (common in Sandbox).
  private deriveEffectiveStatus(
    storedStatus: string,
    expiresAt: string | null,
  ): string {
    const isPotentiallyActive =
      storedStatus === SUBSCRIPTION_STATUS.ACTIVE ||
      storedStatus === SUBSCRIPTION_STATUS.GRACE_PERIOD;
    if (!isPotentiallyActive) {
      return storedStatus;
    }
    if (expiresAt === null || new Date(expiresAt) <= new Date()) {
      return SUBSCRIPTION_STATUS.EXPIRED;
    }
    return storedStatus;
  }

  private async applyWebhookUpdate(
    userId: string,
    transaction: JWSTransactionDecodedPayload,
    update: SubscriptionUpdate,
    signedDateIso: string | null,
  ): Promise<boolean> {
    const patch: TablesUpdate<"profiles"> = {
      subscription_verified_at: new Date().toISOString(),
    };

    if (update.status !== undefined) {
      patch.subscription_status = update.status;
      patch.subscription_expires_at = this.toIsoOrNull(transaction.expiresDate);
      if (transaction.productId !== undefined) {
        patch.subscription_product_id = transaction.productId;
      }
      if (transaction.originalTransactionId !== undefined) {
        patch.subscription_original_transaction_id =
          transaction.originalTransactionId;
      }
      const envValue = this.stringOrNull(transaction.environment);
      if (envValue !== null) {
        patch.subscription_environment = envValue;
      }
    }

    if (update.autoRenewStatus !== undefined) {
      patch.subscription_auto_renew_status = update.autoRenewStatus;
    }

    if (signedDateIso !== null) {
      patch.subscription_apple_signed_at = signedDateIso;
    }

    const didApply = await this.applyProfilePatchIfFresh(
      userId,
      patch,
      signedDateIso,
    );
    if (!didApply) {
      return false;
    }

    this.logger.log(
      `Webhook applied user=${userId} reason=${update.reason} status=${update.status ?? "unchanged"}`,
    );
    return true;
  }

  private async findUserIdForWebhook(
    transaction: JWSTransactionDecodedPayload,
  ): Promise<string | null> {
    const byToken = await this.findUserByAppAccountToken(
      transaction.appAccountToken,
    );
    if (byToken !== null) {
      return byToken;
    }
    return this.findUserByOriginalTransaction(
      transaction.originalTransactionId,
    );
  }

  private async findUserByAppAccountToken(
    appAccountToken: string | undefined,
  ): Promise<string | null> {
    if (appAccountToken === undefined || appAccountToken === "") {
      return null;
    }
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", appAccountToken)
      .maybeSingle();
    if (error && error.code !== SUPABASE_NOT_FOUND) {
      throw new InternalServerErrorException("Failed to lookup user by token");
    }
    return data?.id ?? null;
  }

  private async findUserByOriginalTransaction(
    originalTransactionId: string | undefined,
  ): Promise<string | null> {
    if (originalTransactionId === undefined || originalTransactionId === "") {
      return null;
    }
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("subscription_original_transaction_id", originalTransactionId)
      .maybeSingle();
    if (error && error.code !== SUPABASE_NOT_FOUND) {
      throw new InternalServerErrorException(
        "Failed to lookup user by original transaction",
      );
    }
    return data?.id ?? null;
  }

  private async applyProfilePatchIfFresh(
    userId: string,
    patch: TablesUpdate<"profiles">,
    signedDateIso: string | null,
  ): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();
    let query = supabase.from("profiles").update(patch).eq("id", userId);

    if (signedDateIso !== null) {
      query = query.or(
        `subscription_apple_signed_at.is.null,subscription_apple_signed_at.lt.${signedDateIso}`,
      );
    }

    const { data, error } = await query.select("id");
    if (error) {
      this.logger.error(
        `Failed to persist subscription update user=${userId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        "Failed to persist subscription update",
      );
    }

    return data.length > 0;
  }

  private async assertOriginalTransactionNotOwnedByOther(
    originalTransactionId: string | undefined,
    userId: string,
  ): Promise<void> {
    if (originalTransactionId === undefined || originalTransactionId === "") {
      return;
    }

    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("subscription_original_transaction_id", originalTransactionId)
      .neq("id", userId)
      .maybeSingle();

    if (error && error.code !== SUPABASE_NOT_FOUND) {
      this.logger.error(
        `Collision check failed originalTx=${originalTransactionId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        "Failed to check transaction ownership",
      );
    }

    if (data) {
      this.logger.warn(
        `Rejecting replay originalTx=${originalTransactionId} claimed by user=${userId} but owned by user=${data.id}`,
      );
      throw new UnauthorizedException(
        "Transaction already bound to another user",
      );
    }
  }

  private assertTransactionClaims(tx: JWSTransactionDecodedPayload): void {
    if (this.stringOrNull(tx.type) !== TYPE_AUTO_RENEWABLE) {
      throw new UnauthorizedException("Invalid product type");
    }
    if (tx.bundleId !== config.apple.bundleId) {
      throw new UnauthorizedException("Invalid bundle");
    }
    const productId = tx.productId;
    if (
      productId === undefined ||
      productId === "" ||
      !this.isAllowedProductId(productId)
    ) {
      throw new UnauthorizedException("Unknown product");
    }
    if (this.stringOrNull(tx.inAppOwnershipType) === OWNERSHIP_FAMILY_SHARED) {
      throw new UnauthorizedException(
        "Family-shared subscriptions not supported",
      );
    }
  }

  private assertAppAccountToken(
    appAccountToken: string | undefined,
    userId: string,
  ): void {
    if (appAccountToken === undefined || appAccountToken === "") {
      throw new UnauthorizedException("Transaction not bound to this user");
    }
    if (!UUID_REGEX.test(appAccountToken) || !UUID_REGEX.test(userId)) {
      throw new UnauthorizedException("Transaction not bound to this user");
    }
    if (appAccountToken.toLowerCase() !== userId.toLowerCase()) {
      throw new UnauthorizedException("Transaction not bound to this user");
    }
  }

  private isAllowedProductId(productId: string): boolean {
    return (config.apple.productIds as readonly string[]).includes(productId);
  }

  private deriveStatusFromTransaction(
    tx: JWSTransactionDecodedPayload,
  ): SubscriptionStatus {
    if (tx.revocationDate !== undefined) {
      return SUBSCRIPTION_STATUS.REVOKED;
    }
    if (tx.expiresDate !== undefined && tx.expiresDate > Date.now()) {
      return SUBSCRIPTION_STATUS.ACTIVE;
    }
    return SUBSCRIPTION_STATUS.EXPIRED;
  }

  private async verifyTransactionWithFallback(
    jws: string,
  ): Promise<JWSTransactionDecodedPayload> {
    return this.verifyWithEnvFallback(async (verifier) =>
      verifier.verifyAndDecodeTransaction(jws),
    );
  }

  private async verifyNotificationWithFallback(
    jws: string,
  ): Promise<ResponseBodyV2DecodedPayload> {
    return this.verifyWithEnvFallback(async (verifier) =>
      verifier.verifyAndDecodeNotification(jws),
    );
  }

  private async verifyRenewalInfoWithFallback(
    jws: string,
  ): Promise<JWSRenewalInfoDecodedPayload> {
    return this.verifyWithEnvFallback(async (verifier) =>
      verifier.verifyAndDecodeRenewalInfo(jws),
    );
  }

  private async verifyWithEnvFallback<T>(
    fn: (verifier: SignedDataVerifier) => Promise<T>,
  ): Promise<T> {
    try {
      return await fn(this.primaryVerifier);
    } catch (error) {
      if (
        error instanceof VerificationException &&
        error.status === VerificationStatus.INVALID_ENVIRONMENT &&
        this.sandboxFallbackVerifier
      ) {
        this.logger.log("Retrying verification with sandbox fallback");
        return fn(this.sandboxFallbackVerifier);
      }
      if (error instanceof VerificationException) {
        this.logger.warn(
          `Verification failed status=${VerificationStatus[error.status]}`,
        );
        throw new UnauthorizedException("Invalid signed payload");
      }
      throw error;
    }
  }

  private parseEnvironment(env: string): Environment {
    if (env === "Production") {
      return Environment.PRODUCTION;
    }
    if (env === "Sandbox") {
      return Environment.SANDBOX;
    }
    if (env === "Xcode") {
      return Environment.XCODE;
    }
    if (env === "LocalTesting") {
      return Environment.LOCAL_TESTING;
    }
    throw new Error(
      `Invalid APPLE_ENVIRONMENT: ${env}. Expected one of Sandbox | Production | Xcode | LocalTesting`,
    );
  }

  private toIsoOrNull(ms: number | undefined): string | null {
    if (ms === undefined) {
      return null;
    }
    return new Date(ms).toISOString();
  }

  private stringOrNull(value: string | number | undefined): string | null {
    if (value === undefined) {
      return null;
    }
    return typeof value === "string" ? value : String(value);
  }
}
