import { Module } from '@nestjs/common';

import { DeviceTokensController } from './device-tokens.controller.js';
import { DeviceTokensService } from './device-tokens.service.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  controllers: [DeviceTokensController, NotificationsController],
  providers: [NotificationsService, DeviceTokensService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
