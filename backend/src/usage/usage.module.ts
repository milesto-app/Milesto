import { Global, Module } from '@nestjs/common';

import { SubscriptionController } from './subscription.controller.js';
import { SubscriptionService } from './subscription.service.js';
import { UsageController } from './usage.controller.js';
import { UsageService } from './usage.service.js';

@Global()
@Module({
  controllers: [UsageController, SubscriptionController],
  providers: [UsageService, SubscriptionService],
  exports: [UsageService],
})
export class UsageModule {}
