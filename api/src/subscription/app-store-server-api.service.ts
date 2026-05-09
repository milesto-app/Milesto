import {
  APIException,
  AppStoreServerAPIClient,
  Environment,
  type StatusResponse,
} from "@apple/app-store-server-library";
import { Injectable, Logger } from "@nestjs/common";

import { config } from "../config/app.config.js";

type AppleServerApiErrorKind =
  | "bad_request"
  | "configuration"
  | "not_found"
  | "rate_limited"
  | "retryable";

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_RATE_LIMITED = 429;
const HTTP_INTERNAL_SERVER_ERROR = 500;

function hasValue(v: string | undefined): v is string {
  return v !== undefined && v !== "";
}

function normalizePrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, "\n");
}

export class AppleServerApiError extends Error {
  constructor(
    public readonly kind: AppleServerApiErrorKind,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}

@Injectable()
export class AppStoreServerApiService {
  private readonly logger = new Logger(AppStoreServerApiService.name);
  private readonly productionClient: AppStoreServerAPIClient | null;
  private readonly sandboxClient: AppStoreServerAPIClient | null;
  public readonly isConfigured: boolean;

  constructor() {
    const { issuerId, keyId, privateKey } = config.appleServerApi;
    const hasRequiredConfig =
      hasValue(issuerId) && hasValue(keyId) && hasValue(privateKey);
    this.isConfigured = hasRequiredConfig;

    if (!hasRequiredConfig) {
      this.productionClient = null;
      this.sandboxClient = null;
      this.handleMissingConfig();
      return;
    }

    const signingKey = normalizePrivateKey(privateKey);
    this.productionClient = new AppStoreServerAPIClient(
      signingKey,
      keyId,
      issuerId,
      config.apple.bundleId,
      Environment.PRODUCTION,
    );
    this.sandboxClient = new AppStoreServerAPIClient(
      signingKey,
      keyId,
      issuerId,
      config.apple.bundleId,
      Environment.SANDBOX,
    );
  }

  public async getSubscriptionStatuses(
    originalTransactionId: string,
    environment: Environment.PRODUCTION | Environment.SANDBOX,
  ): Promise<StatusResponse> {
    const client = this.getClient(environment);
    try {
      return await client.getAllSubscriptionStatuses(originalTransactionId);
    } catch (error) {
      throw this.mapApiError(error, originalTransactionId, environment);
    }
  }

  private getClient(
    environment: Environment.PRODUCTION | Environment.SANDBOX,
  ): AppStoreServerAPIClient {
    const client =
      environment === Environment.PRODUCTION
        ? this.productionClient
        : this.sandboxClient;
    if (client === null) {
      throw new AppleServerApiError(
        "configuration",
        "App Store Server API is not configured",
      );
    }
    return client;
  }

  private handleMissingConfig(): void {
    const message =
      "App Store Server API not configured; subscription sync cannot query Apple";
    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    }
    this.logger.warn(message);
  }

  private mapApiError(
    error: unknown,
    originalTransactionId: string,
    environment: Environment,
  ): AppleServerApiError {
    if (!(error instanceof APIException)) {
      return new AppleServerApiError(
        "retryable",
        "Unexpected App Store Server API failure",
        error,
      );
    }

    const status = error.httpStatusCode;
    const message = `Apple API failed env=${environment} originalTx=${originalTransactionId} http=${status} api=${error.apiError ?? "none"}`;
    if (status === HTTP_UNAUTHORIZED || status === HTTP_FORBIDDEN) {
      return new AppleServerApiError("configuration", message, error);
    }
    if (status === HTTP_NOT_FOUND) {
      return new AppleServerApiError("not_found", message, error);
    }
    if (status === HTTP_RATE_LIMITED) {
      return new AppleServerApiError("rate_limited", message, error);
    }
    if (status === HTTP_BAD_REQUEST) {
      return new AppleServerApiError("bad_request", message, error);
    }
    if (status >= HTTP_INTERNAL_SERVER_ERROR) {
      return new AppleServerApiError("retryable", message, error);
    }
    return new AppleServerApiError("retryable", message, error);
  }
}
