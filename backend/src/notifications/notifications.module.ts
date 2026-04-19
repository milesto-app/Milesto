import { Global, Module } from "@nestjs/common";

import { ActivityController } from "./activity/activity.controller.js";
import { ActivityService } from "./activity/activity.service.js";
import { DeliveryTelemetryController } from "./deliveries/delivery-telemetry.controller.js";
import { DeliveryTelemetryService } from "./deliveries/delivery-telemetry.service.js";
import { DeviceTokensController } from "./device-tokens.controller.js";
import { DeviceTokensService } from "./device-tokens.service.js";
import { DispatcherService } from "./dispatcher/dispatcher.service.js";
import { OrphanRecoveryService } from "./dispatcher/orphan-recovery.service.js";
import { GateService } from "./gate/gate.service.js";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";
import { OutboxService } from "./outbox/outbox.service.js";
import { CoachReplyProducer } from "./producers/coach-reply.producer.js";
import { MilestonePreviewProducer } from "./producers/milestone-preview.producer.js";
import { SchedulerService } from "./producers/scheduler.service.js";
import { StreaksService } from "./streaks/streaks.service.js";
import { StreaksAtRiskService } from "./streaks/streaks-at-risk.service.js";
import { StreaksNightlyService } from "./streaks/streaks-nightly.service.js";

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
    GateService,
    MilestonePreviewProducer,
    NotificationsService,
    OrphanRecoveryService,
    OutboxService,
    SchedulerService,
    StreaksAtRiskService,
    StreaksNightlyService,
    StreaksService,
  ],
  exports: [ActivityService, GateService, NotificationsService, OutboxService],
})
export class NotificationsModule {}
