import { Global, Module } from "@nestjs/common";

import { AppStoreServerApiService } from "./app-store-server-api.service.js";
import { ProcessedNotificationsService } from "./processed-notifications.service.js";
import { SubscriptionController } from "./subscription.controller.js";
import { SubscriptionService } from "./subscription.service.js";
import { UsageService } from "./usage.service.js";

@Global()
@Module({
  controllers: [SubscriptionController],
  providers: [
    UsageService,
    SubscriptionService,
    ProcessedNotificationsService,
    AppStoreServerApiService,
  ],
  exports: [UsageService],
})
export class UsageModule {}
