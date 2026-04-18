import { Injectable, Logger, NotImplementedException } from '@nestjs/common';

import { config } from '../config/app.config.js';

function hasValue(v: string | undefined): boolean {
  return v !== undefined && v !== '';
}

@Injectable()
export class AppStoreServerApiService {
  private readonly logger = new Logger(AppStoreServerApiService.name);
  public readonly isConfigured: boolean;

  constructor() {
    const { issuerId, keyId, privateKey } = config.appleServerApi;
    this.isConfigured =
      hasValue(issuerId) && hasValue(keyId) && hasValue(privateKey);

    if (!this.isConfigured) {
      this.logger.log(
        'App Store Server API not configured — reconciliation disabled',
      );
    }
  }

  public async getNotificationHistory(): Promise<never> {
    return Promise.reject(
      new NotImplementedException(
        'App Store Server API notification history not implemented',
      ),
    );
  }

  public async getSubscriptionStatuses(
    originalTransactionId: string,
  ): Promise<never> {
    return Promise.reject(
      new NotImplementedException(
        `App Store Server API subscription statuses not implemented (original transaction id: ${originalTransactionId})`,
      ),
    );
  }
}
