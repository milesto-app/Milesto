import { Global, Module } from "@nestjs/common";

import { ActivityController } from "./activity/activity.controller.js";
import { ActivityService } from "./activity/activity.service.js";
import { DeliveryTelemetryController } from "./deliveries/delivery-telemetry.controller.js";
import { DeliveryTelemetryService } from "./deliveries/delivery-telemetry.service.js";
import { DeviceTokensController } from "./device-tokens.controller.js";
import { DeviceTokensService } from "./device-tokens.service.js";
import { DispatcherService } from "./dispatcher/dispatcher.service.js";
import { OrphanRecoveryService } from "./dispatcher/orphan-recovery.service.js";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";
import { OutboxService } from "./outbox/outbox.service.js";
import { CoachReplyProducer } from "./producers/coach-reply.producer.js";
import { SchedulerService } from "./producers/scheduler.service.js";

@Global()
@Module({
  controllers: [
    ActivityController,
    DeliveryTelemetryController,
    DeviceTokensController,
    NotificationsController,
  ],
  providers: [
    ActivityService,
    CoachReplyProducer,
    DeliveryTelemetryService,
    DeviceTokensService,
    DispatcherService,
    NotificationsService,
    OrphanRecoveryService,
    OutboxService,
    SchedulerService,
  ],
  exports: [ActivityService, NotificationsService, OutboxService],
})
export class NotificationsModule {}
