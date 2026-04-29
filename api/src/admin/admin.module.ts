import { Module } from "@nestjs/common";

import { IntakeModule } from "../intake/intake.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { RoadmapModule } from "../roadmap/roadmap.module.js";
import { AdminUsageController } from "./admin-usage.controller.js";
import { AdminUsageService } from "./admin-usage.service.js";
import { CoachesController } from "./coaches.controller.js";
import { CoachesService } from "./coaches.service.js";
import { ConversationsController } from "./conversations.controller.js";
import { ConversationsService } from "./conversations.service.js";
import { GoalsController } from "./goals.controller.js";
import { GoalsService } from "./goals.service.js";
import { AdminIntakeController } from "./intake.controller.js";
import { AdminIntakeService } from "./intake.service.js";
import { MetaController } from "./meta.controller.js";
import { MetaService } from "./meta.service.js";
import { AdminNotificationsController } from "./notifications.controller.js";
import { AdminNotificationsService } from "./notifications.service.js";
import { OverviewController } from "./overview.controller.js";
import { OverviewService } from "./overview.service.js";
import { SubscriptionsController } from "./subscriptions.controller.js";
import { SubscriptionsService } from "./subscriptions.service.js";
import { SystemController } from "./system.controller.js";
import { SystemService } from "./system.service.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

@Module({
  imports: [IntakeModule, NotificationsModule, RoadmapModule],
  controllers: [
    OverviewController,
    UsersController,
    GoalsController,
    ConversationsController,
    CoachesController,
    SubscriptionsController,
    AdminUsageController,
    AdminNotificationsController,
    AdminIntakeController,
    SystemController,
    MetaController,
  ],
  providers: [
    OverviewService,
    UsersService,
    GoalsService,
    ConversationsService,
    CoachesService,
    SubscriptionsService,
    AdminUsageService,
    AdminNotificationsService,
    AdminIntakeService,
    SystemService,
    MetaService,
  ],
})
export class AdminModule {}
