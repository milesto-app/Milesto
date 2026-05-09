import {
  Environment,
  InAppOwnershipType,
  type JWSRenewalInfoDecodedPayload,
  type JWSTransactionDecodedPayload,
  type LastTransactionsItem,
  type ResponseBodyV2DecodedPayload,
  SignedDataVerifier,
  type StatusResponse,
  Type,
  VerificationException,
  VerificationStatus,
} from "@apple/app-store-server-library";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";

import { config } from "../config/app.config.js";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "../supabase/database.types.js";
import { SUPABASE_NOT_FOUND } from "../supabase/error-codes.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import {
  AppleServerApiError,
  AppStoreServerApiService,
} from "./app-store-server-api.service.js";
import { loadAppleRootCertificates } from "./apple-root-certs.js";
import {
  appleStatusToSubscriptionStatus,
  isEffectiveProStatus,
  SUBSCRIPTION_SOURCE,
  SUBSCRIPTION_STATUS,
  type SubscriptionSource,
  type SubscriptionStatus,
} from "./subscription-state.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TEST_NOTIFICATION_TYPE = "TEST";
const ACTIVE_ACCOUNT_SORT_BOOST = 9_000_000_000_000_000;
const APPLE_AUTO_RENEW_ON = 1;
const EVENT_RESULT = {
  PROCESSED: "processed",
  IGNORED: "ignored",
  ERROR: "error",
} as const;

type AppleEnvironment = Environment.PRODUCTION | Environment.SANDBOX;
type AppleAccountRow = Tables<"apple_subscription_accounts">;
type OverrideRow = Tables<"subscription_overrides">;

interface SubscriptionStatusResponse {
  status: string;
  expiresAt: string | null;
  productId: string | null;
  autoRenew: boolean | null;
  environment: string | null;
  source: SubscriptionSource;
  lastSyncedAt: string | null;
}

interface CanonicalAppleSubscription {
  status: SubscriptionStatus;
  expiresAt: string | null;
  productId: string | null;
  autoRenewStatus: boolean | null;
  lastTransactionId: string | null;
  appleStatusCode: number | null;
  appleSignedAt: string | null;
}

interface DecodedLastTransaction {
  item: LastTransactionsItem;
  transaction: JWSTransactionDecodedPayload;
  renewalInfo: JWSRenewalInfoDecodedPayload | null;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly primaryVerifier: SignedDataVerifier;
  private readonly sandboxFallbackVerifier: SignedDataVerifier | null;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly appStoreServerApi: AppStoreServerApiService,
  ) {
    const rootCerts = loadAppleRootCertificates(config.apple.rootCaDir);
    const environment = this.parseVerificationEnvironment(
      config.apple.environment,
    );

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

  public async syncWithTransaction(
    userId: string,
    transactionJws: string,
  ): Promise<void> {
    const transaction =
      await this.verifyTransactionWithFallback(transactionJws);
    this.assertTransactionClaims(transaction);
    const environment = this.requireAppleServerEnvironment(
      transaction.environment,
    );
    const originalTransactionId =
      this.requireOriginalTransactionId(transaction);
    await this.assertTransactionOwnership(transaction, userId, environment);
    await this.syncOriginalTransactionForUser(
      userId,
      originalTransactionId,
      environment,
    );
  }

  public async handleWebhook(signedPayload: string): Promise<void> {
    if (typeof signedPayload !== "string" || signedPayload === "") {
      throw new BadRequestException("Missing signedPayload");
    }

    const notification =
      await this.verifyNotificationWithFallback(signedPayload);
    const notificationUuid = this.requireNotificationUuid(notification);
    const type = this.stringOrNull(notification.notificationType) ?? "UNKNOWN";
    const subtype = this.stringOrNull(notification.subtype);

    const previousEvent = await this.findEvent(notificationUuid);
    if (previousEvent !== null && previousEvent.result !== EVENT_RESULT.ERROR) {
      this.logger.debug(`Dedupe hit notificationUUID=${notificationUuid}`);
      return;
    }

    if (type === TEST_NOTIFICATION_TYPE) {
      await this.recordEvent({
        notification_uuid: notificationUuid,
        notification_type: type,
        subtype,
        result: EVENT_RESULT.IGNORED,
      });
      return;
    }

    try {
      const eventPatch = await this.processWebhookNotification(
        notification,
        notificationUuid,
        type,
        subtype,
      );
      await this.recordEvent(eventPatch);
    } catch (error) {
      await this.recordEvent({
        notification_uuid: notificationUuid,
        notification_type: type,
        subtype,
        result: EVENT_RESULT.ERROR,
        error_message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async getStatus(userId: string): Promise<SubscriptionStatusResponse> {
    const state = await this.getEffectiveSubscriptionState(userId);
    return {
      status: state.status,
      expiresAt: state.expiresAt,
      productId: state.productId,
      autoRenew: state.autoRenew,
      environment: state.environment,
      source: state.source,
      lastSyncedAt: state.lastSyncedAt,
    };
  }

  public async refreshUserAppleSubscriptions(
    userId: string,
  ): Promise<SubscriptionStatusResponse> {
    const accounts = await this.fetchAppleAccounts(userId);
    if (accounts.length === 0) {
      await this.refreshProfileCache(userId);
      return this.getStatus(userId);
    }

    await Promise.all(
      accounts.map(async (account) =>
        this.syncOriginalTransactionForUser(
          userId,
          account.original_transaction_id,
          this.requireAppleServerEnvironment(account.environment),
        ),
      ),
    );
    return this.getStatus(userId);
  }

  public async grantOverride(
    userId: string,
    expiresAt: string,
    createdBy: string,
    reason = "admin",
  ): Promise<SubscriptionStatusResponse> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase.from("subscription_overrides").insert({
      user_id: userId,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      expires_at: expiresAt,
      reason,
      created_by: createdBy,
    });
    if (error !== null) {
      this.logger.error(`Failed to grant override: ${error.message}`);
      throw new InternalServerErrorException("Failed to grant pro override");
    }
    await this.refreshProfileCache(userId);
    return this.getStatus(userId);
  }

  public async revokeOverride(
    userId: string,
  ): Promise<SubscriptionStatusResponse> {
    const supabase = this.supabaseService.getAdminClient();
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("subscription_overrides")
      .update({ status: SUBSCRIPTION_STATUS.REVOKED, revoked_at: nowIso })
      .eq("user_id", userId)
      .eq("status", SUBSCRIPTION_STATUS.ACTIVE)
      .is("revoked_at", null);
    if (error !== null) {
      this.logger.error(`Failed to revoke override: ${error.message}`);
      throw new InternalServerErrorException("Failed to revoke pro override");
    }
    await this.refreshProfileCache(userId);
    return this.getStatus(userId);
  }

  private async processWebhookNotification(
    notification: ResponseBodyV2DecodedPayload,
    notificationUuid: string,
    type: string,
    subtype: string | null,
  ): Promise<TablesInsert<"apple_subscription_events">> {
    const signedTx = notification.data?.signedTransactionInfo;
    if (signedTx === undefined || signedTx === "") {
      this.logger.warn(
        `Notification ${notificationUuid} (${type}) has no signedTransactionInfo`,
      );
      return {
        notification_uuid: notificationUuid,
        notification_type: type,
        subtype,
        result: EVENT_RESULT.IGNORED,
      };
    }

    const transaction = await this.verifyTransactionWithFallback(signedTx);
    this.assertTransactionClaims(transaction);
    const environment = this.requireAppleServerEnvironment(
      notification.data?.environment ?? transaction.environment,
    );
    const originalTransactionId =
      this.requireOriginalTransactionId(transaction);
    const userId = await this.findUserIdForAppleTransaction(
      transaction,
      environment,
    );

    if (userId === null) {
      this.logger.warn(
        `No user for Apple notification originalTx=${originalTransactionId}`,
      );
      return {
        notification_uuid: notificationUuid,
        notification_type: type,
        subtype,
        environment,
        original_transaction_id: originalTransactionId,
        result: EVENT_RESULT.IGNORED,
      };
    }

    await this.syncOriginalTransactionForUser(
      userId,
      originalTransactionId,
      environment,
    );
    return {
      notification_uuid: notificationUuid,
      notification_type: type,
      subtype,
      environment,
      original_transaction_id: originalTransactionId,
      user_id: userId,
      result: EVENT_RESULT.PROCESSED,
    };
  }

  private async syncOriginalTransactionForUser(
    userId: string,
    originalTransactionId: string,
    environment: AppleEnvironment,
  ): Promise<void> {
    const response = await this.fetchAppleStatuses(
      originalTransactionId,
      environment,
    );
    const canonical = await this.deriveCanonicalSubscription(
      response,
      originalTransactionId,
    );
    if (canonical === null) {
      throw new NotFoundException("No supported Apple subscription found");
    }

    await this.upsertAppleAccount(
      userId,
      environment,
      originalTransactionId,
      canonical,
    );
    await this.refreshProfileCache(userId);
  }

  private async fetchAppleStatuses(
    originalTransactionId: string,
    environment: AppleEnvironment,
  ): Promise<StatusResponse> {
    try {
      return await this.appStoreServerApi.getSubscriptionStatuses(
        originalTransactionId,
        environment,
      );
    } catch (error) {
      if (!(error instanceof AppleServerApiError)) {
        throw error;
      }
      this.logger.warn(error.message);
      if (error.kind === "not_found") {
        throw new NotFoundException("Apple transaction not found");
      }
      if (error.kind === "bad_request" || error.kind === "configuration") {
        throw new UnauthorizedException("Apple subscription sync failed");
      }
      throw new ServiceUnavailableException(
        "Apple subscription sync unavailable",
      );
    }
  }

  private async deriveCanonicalSubscription(
    response: StatusResponse,
    originalTransactionId: string,
  ): Promise<CanonicalAppleSubscription | null> {
    const items = this.extractLastTransactions(response);
    const decoded = await Promise.all(
      items.map(async (item) => this.decodeLastTransaction(item)),
    );
    const candidates = decoded.filter((candidate) =>
      this.isUsableCandidate(candidate, originalTransactionId),
    );
    const best = this.pickBestCandidate(candidates);
    if (best === null) {
      return null;
    }

    const status = appleStatusToSubscriptionStatus(best.item.status);
    const renewalExpiresAt = this.toIsoOrNull(
      best.renewalInfo?.gracePeriodExpiresDate,
    );
    const transactionExpiresAt = this.toIsoOrNull(best.transaction.expiresDate);
    const expiresAt =
      status === SUBSCRIPTION_STATUS.GRACE_PERIOD
        ? (renewalExpiresAt ?? transactionExpiresAt)
        : transactionExpiresAt;

    return {
      status,
      expiresAt,
      productId: best.transaction.productId ?? null,
      autoRenewStatus: this.autoRenewFromRenewalInfo(best.renewalInfo),
      lastTransactionId: best.transaction.transactionId ?? null,
      appleStatusCode:
        typeof best.item.status === "number" ? best.item.status : null,
      appleSignedAt: this.newestIso(
        best.transaction.signedDate,
        best.renewalInfo?.signedDate,
      ),
    };
  }

  private extractLastTransactions(
    response: StatusResponse,
  ): LastTransactionsItem[] {
    return (
      response.data?.flatMap((group) => group.lastTransactions ?? []) ?? []
    );
  }

  private async decodeLastTransaction(
    item: LastTransactionsItem,
  ): Promise<DecodedLastTransaction | null> {
    if (item.signedTransactionInfo === undefined) {
      return null;
    }

    const transaction = await this.verifyTransactionWithFallback(
      item.signedTransactionInfo,
    );
    const renewalInfo =
      item.signedRenewalInfo === undefined
        ? null
        : await this.verifyRenewalInfoWithFallback(item.signedRenewalInfo);
    return { item, transaction, renewalInfo };
  }

  private isUsableCandidate(
    candidate: DecodedLastTransaction | null,
    originalTransactionId: string,
  ): candidate is DecodedLastTransaction {
    if (candidate === null) {
      return false;
    }
    try {
      this.assertTransactionClaims(candidate.transaction);
    } catch (error) {
      this.logger.warn(
        `Ignoring unsupported Apple transaction: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
    return (
      candidate.transaction.originalTransactionId === originalTransactionId
    );
  }

  private pickBestCandidate(
    candidates: DecodedLastTransaction[],
  ): DecodedLastTransaction | null {
    let best: DecodedLastTransaction | null = null;
    for (const candidate of candidates) {
      if (
        best === null ||
        this.candidateSortValue(candidate) > this.candidateSortValue(best)
      ) {
        best = candidate;
      }
    }
    return best;
  }

  private candidateSortValue(candidate: DecodedLastTransaction): number {
    return Math.max(
      candidate.transaction.expiresDate ?? 0,
      candidate.transaction.purchaseDate ?? 0,
      candidate.transaction.signedDate ?? 0,
      candidate.renewalInfo?.signedDate ?? 0,
    );
  }

  private async upsertAppleAccount(
    userId: string,
    environment: AppleEnvironment,
    originalTransactionId: string,
    canonical: CanonicalAppleSubscription,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const nowIso = new Date().toISOString();
    const { error } = await supabase.from("apple_subscription_accounts").upsert(
      {
        user_id: userId,
        environment,
        original_transaction_id: originalTransactionId,
        status: canonical.status,
        product_id: canonical.productId,
        expires_at: canonical.expiresAt,
        auto_renew_status: canonical.autoRenewStatus,
        last_transaction_id: canonical.lastTransactionId,
        apple_status_code: canonical.appleStatusCode,
        apple_signed_at: canonical.appleSignedAt,
        last_synced_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "environment,original_transaction_id" },
    );
    if (error !== null) {
      this.logger.error(
        `Failed to persist Apple subscription: ${error.message}`,
      );
      throw new InternalServerErrorException(
        "Failed to persist Apple subscription",
      );
    }
  }

  private async refreshProfileCache(userId: string): Promise<void> {
    const state = await this.getEffectiveSubscriptionState(userId);
    const patch: TablesUpdate<"profiles"> = {
      subscription_status: state.status,
      subscription_expires_at: state.expiresAt,
      subscription_product_id: state.productId,
      subscription_auto_renew_status: state.autoRenew,
      subscription_environment: state.environment,
      subscription_verified_at: new Date().toISOString(),
    };

    if (state.source === SUBSCRIPTION_SOURCE.APPLE) {
      patch.subscription_original_transaction_id = state.originalTransactionId;
      patch.subscription_apple_signed_at = state.appleSignedAt;
    } else {
      patch.subscription_original_transaction_id = null;
      patch.subscription_apple_signed_at = null;
    }

    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", userId);
    if (error !== null) {
      this.logger.error(
        `Failed to update subscription cache: ${error.message}`,
      );
      throw new InternalServerErrorException(
        "Failed to update subscription cache",
      );
    }
  }

  private async getEffectiveSubscriptionState(userId: string): Promise<
    SubscriptionStatusResponse & {
      originalTransactionId: string | null;
      appleSignedAt: string | null;
    }
  > {
    const [accounts, override] = await Promise.all([
      this.fetchAppleAccounts(userId),
      this.fetchActiveOverride(userId),
    ]);
    const bestApple = this.pickBestAppleAccount(accounts);
    if (bestApple !== null && this.isAccountCurrentlyPro(bestApple)) {
      return this.stateFromAppleAccount(bestApple);
    }
    if (override !== null) {
      return this.stateFromOverride(override);
    }
    if (bestApple !== null) {
      return this.stateFromAppleAccount(bestApple);
    }
    return {
      status: SUBSCRIPTION_STATUS.UNKNOWN,
      expiresAt: null,
      productId: null,
      autoRenew: null,
      environment: null,
      source: SUBSCRIPTION_SOURCE.NONE,
      lastSyncedAt: null,
      originalTransactionId: null,
      appleSignedAt: null,
    };
  }

  private async fetchAppleAccounts(userId: string): Promise<AppleAccountRow[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("apple_subscription_accounts")
      .select("*")
      .eq("user_id", userId)
      .order("last_synced_at", { ascending: false });
    if (error !== null) {
      this.logger.error(`Failed to load Apple accounts: ${error.message}`);
      throw new InternalServerErrorException("Failed to load subscriptions");
    }
    return data;
  }

  private async fetchActiveOverride(
    userId: string,
  ): Promise<OverrideRow | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("subscription_overrides")
      .select("*")
      .eq("user_id", userId)
      .eq("status", SUBSCRIPTION_STATUS.ACTIVE)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error !== null && error.code !== SUPABASE_NOT_FOUND) {
      this.logger.error(`Failed to load override: ${error.message}`);
      throw new InternalServerErrorException("Failed to load subscription");
    }
    return data ?? null;
  }

  private pickBestAppleAccount(
    accounts: AppleAccountRow[],
  ): AppleAccountRow | null {
    let best: AppleAccountRow | null = null;
    for (const account of accounts) {
      if (
        best === null ||
        this.accountSortValue(account) > this.accountSortValue(best)
      ) {
        best = account;
      }
    }
    return best;
  }

  private accountSortValue(account: AppleAccountRow): number {
    const statusBoost = this.isAccountCurrentlyPro(account)
      ? ACTIVE_ACCOUNT_SORT_BOOST
      : 0;
    return (
      statusBoost +
      Math.max(
        Date.parse(account.expires_at ?? "") || 0,
        Date.parse(account.last_synced_at) || 0,
      )
    );
  }

  private isAccountCurrentlyPro(account: AppleAccountRow): boolean {
    return isEffectiveProStatus(account.status, account.expires_at);
  }

  private stateFromAppleAccount(
    account: AppleAccountRow,
  ): SubscriptionStatusResponse & {
    originalTransactionId: string;
    appleSignedAt: string | null;
  } {
    const status = this.isAccountCurrentlyPro(account)
      ? account.status
      : this.expireStoredStatus(account.status);
    return {
      status,
      expiresAt: account.expires_at,
      productId: account.product_id,
      autoRenew: account.auto_renew_status,
      environment: account.environment,
      source: SUBSCRIPTION_SOURCE.APPLE,
      lastSyncedAt: account.last_synced_at,
      originalTransactionId: account.original_transaction_id,
      appleSignedAt: account.apple_signed_at,
    };
  }

  private stateFromOverride(
    override: OverrideRow,
  ): SubscriptionStatusResponse & {
    originalTransactionId: null;
    appleSignedAt: null;
  } {
    return {
      status: SUBSCRIPTION_STATUS.ACTIVE,
      expiresAt: override.expires_at,
      productId: null,
      autoRenew: null,
      environment: null,
      source: SUBSCRIPTION_SOURCE.OVERRIDE,
      lastSyncedAt: override.created_at,
      originalTransactionId: null,
      appleSignedAt: null,
    };
  }

  private expireStoredStatus(status: string): string {
    if (
      status === SUBSCRIPTION_STATUS.ACTIVE ||
      status === SUBSCRIPTION_STATUS.GRACE_PERIOD
    ) {
      return SUBSCRIPTION_STATUS.EXPIRED;
    }
    return status;
  }

  private async assertTransactionOwnership(
    transaction: JWSTransactionDecodedPayload,
    userId: string,
    environment: AppleEnvironment,
  ): Promise<void> {
    const originalTransactionId =
      this.requireOriginalTransactionId(transaction);
    const existing = await this.findAccountByOriginalTransaction(
      environment,
      originalTransactionId,
    );
    if (existing !== null) {
      if (existing.user_id !== userId) {
        throw new UnauthorizedException(
          "Transaction already bound to another user",
        );
      }
      return;
    }
    this.rejectUnlessMatchingAppAccountToken(
      transaction.appAccountToken,
      userId,
    );
  }

  private async findUserIdForAppleTransaction(
    transaction: JWSTransactionDecodedPayload,
    environment: AppleEnvironment,
  ): Promise<string | null> {
    const originalTransactionId =
      this.requireOriginalTransactionId(transaction);
    const existing = await this.findAccountByOriginalTransaction(
      environment,
      originalTransactionId,
    );
    if (existing !== null) {
      return existing.user_id;
    }
    const token = transaction.appAccountToken;
    if (token === undefined || !UUID_REGEX.test(token)) {
      return null;
    }
    return this.findProfileId(token);
  }

  private async findAccountByOriginalTransaction(
    environment: AppleEnvironment,
    originalTransactionId: string,
  ): Promise<AppleAccountRow | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("apple_subscription_accounts")
      .select("*")
      .eq("environment", environment)
      .eq("original_transaction_id", originalTransactionId)
      .maybeSingle();
    if (error !== null && error.code !== SUPABASE_NOT_FOUND) {
      this.logger.error(`Failed to lookup Apple account: ${error.message}`);
      throw new InternalServerErrorException("Failed to lookup subscription");
    }
    return data ?? null;
  }

  private async findProfileId(userId: string): Promise<string | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (error !== null && error.code !== SUPABASE_NOT_FOUND) {
      throw new InternalServerErrorException("Failed to lookup user profile");
    }
    return data?.id ?? null;
  }

  private assertTransactionClaims(tx: JWSTransactionDecodedPayload): void {
    const txId = tx.transactionId ?? "unknown";
    if (tx.type !== Type.AUTO_RENEWABLE_SUBSCRIPTION) {
      this.logger.warn(`Reject tx=${txId}: invalid type=${tx.type}`);
      throw new UnauthorizedException("Invalid product type");
    }
    if (tx.bundleId !== config.apple.bundleId) {
      this.logger.warn(
        `Reject tx=${txId}: bundle mismatch jws=${tx.bundleId} expected=${config.apple.bundleId}`,
      );
      throw new UnauthorizedException("Invalid bundle");
    }
    const productId = tx.productId;
    if (
      productId === undefined ||
      productId === "" ||
      !this.isAllowedProductId(productId)
    ) {
      this.logger.warn(`Reject tx=${txId}: unknown product=${productId}`);
      throw new UnauthorizedException("Unknown product");
    }
    if (tx.inAppOwnershipType === InAppOwnershipType.FAMILY_SHARED) {
      this.logger.warn(`Reject tx=${txId}: family-shared subscription`);
      throw new UnauthorizedException(
        "Family-shared subscriptions not supported",
      );
    }
  }

  private rejectUnlessMatchingAppAccountToken(
    appAccountToken: string | undefined,
    userId: string,
  ): void {
    if (
      appAccountToken === undefined ||
      !UUID_REGEX.test(appAccountToken) ||
      !UUID_REGEX.test(userId) ||
      appAccountToken.toLowerCase() !== userId.toLowerCase()
    ) {
      throw new UnauthorizedException("Transaction not bound to this user");
    }
  }

  private requireOriginalTransactionId(
    transaction: JWSTransactionDecodedPayload,
  ): string {
    const originalTransactionId = transaction.originalTransactionId;
    if (originalTransactionId === undefined || originalTransactionId === "") {
      throw new UnauthorizedException("Missing original transaction id");
    }
    return originalTransactionId;
  }

  private requireNotificationUuid(
    notification: ResponseBodyV2DecodedPayload,
  ): string {
    const notificationUuid = notification.notificationUUID;
    if (notificationUuid === undefined || notificationUuid === "") {
      throw new BadRequestException("Missing notificationUUID");
    }
    return notificationUuid;
  }

  private requireAppleServerEnvironment(
    value: string | number | undefined,
  ): AppleEnvironment {
    if (value === Environment.PRODUCTION || value === "Production") {
      return Environment.PRODUCTION;
    }
    if (value === Environment.SANDBOX || value === "Sandbox") {
      return Environment.SANDBOX;
    }
    throw new UnauthorizedException("Unsupported Apple environment");
  }

  private async findEvent(
    notificationUuid: string,
  ): Promise<Tables<"apple_subscription_events"> | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("apple_subscription_events")
      .select("*")
      .eq("notification_uuid", notificationUuid)
      .maybeSingle();
    if (error !== null && error.code !== SUPABASE_NOT_FOUND) {
      throw new InternalServerErrorException("Failed to lookup event");
    }
    return data ?? null;
  }

  private async recordEvent(
    event: TablesInsert<"apple_subscription_events">,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("apple_subscription_events")
      .upsert(event, { onConflict: "notification_uuid" });
    if (error !== null) {
      this.logger.error(`Failed to record Apple event: ${error.message}`);
      throw new InternalServerErrorException("Failed to record Apple event");
    }
  }

  private isAllowedProductId(productId: string): boolean {
    return (config.apple.productIds as readonly string[]).includes(productId);
  }

  private autoRenewFromRenewalInfo(
    renewalInfo: JWSRenewalInfoDecodedPayload | null,
  ): boolean | null {
    if (renewalInfo?.autoRenewStatus === undefined) {
      return null;
    }
    return renewalInfo.autoRenewStatus === APPLE_AUTO_RENEW_ON;
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
        this.sandboxFallbackVerifier !== null
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

  private parseVerificationEnvironment(env: string): Environment {
    if (env === "Production") {
      return Environment.PRODUCTION;
    }
    if (env === "Xcode") {
      return Environment.XCODE;
    }
    throw new Error(
      `Invalid APPLE_ENVIRONMENT: ${env}. Expected one of Production | Xcode`,
    );
  }

  private newestIso(
    left: number | undefined,
    right: number | undefined,
  ): string | null {
    const value = Math.max(left ?? 0, right ?? 0);
    return value === 0 ? null : new Date(value).toISOString();
  }

  private toIsoOrNull(ms: number | undefined): string | null {
    return ms === undefined ? null : new Date(ms).toISOString();
  }

  private stringOrNull(value: string | number | undefined): string | null {
    if (value === undefined) {
      return null;
    }
    return typeof value === "string" ? value : String(value);
  }
}
