import { Module } from "@nestjs/common";

import { DeviceTokensController } from "./device-tokens.controller.js";
import { DeviceTokensService } from "./device-tokens.service.js";
import { NotificationCopyService } from "./notification-copy.service.js";
import { NotificationSchedulerService } from "./notification-scheduler.service.js";
import { NotificationSendsService } from "./notification-sends.service.js";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";

@Module({
  controllers: [DeviceTokensController, NotificationsController],
  providers: [
    DeviceTokensService,
    NotificationsService,
    NotificationCopyService,
    NotificationSchedulerService,
    NotificationSendsService,
  ],
  exports: [
    DeviceTokensService,
    NotificationsService,
    NotificationSchedulerService,
  ],
})
export class NotificationsModule {}
