import { Module } from "@nestjs/common";

import { AppStoreServerApiService } from "./app-store-server-api.service.js";
import { ProcessedNotificationsService } from "./processed-notifications.service.js";
import { SubscriptionController } from "./subscription.controller.js";
import { SubscriptionService } from "./subscription.service.js";

@Module({
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    ProcessedNotificationsService,
    AppStoreServerApiService,
  ],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
