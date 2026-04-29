import { Module } from "@nestjs/common";

import { IntakeModule } from "../intake/intake.module.js";
import { RoadmapModule } from "../roadmap/roadmap.module.js";
import { ConversationsController } from "./conversations.controller.js";
import { ConversationsService } from "./conversations.service.js";
import { GoalsController } from "./goals.controller.js";
import { GoalsService } from "./goals.service.js";
import { OverviewController } from "./overview.controller.js";
import { OverviewService } from "./overview.service.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

@Module({
  imports: [IntakeModule, RoadmapModule],
  controllers: [
    OverviewController,
    UsersController,
    GoalsController,
    ConversationsController,
  ],
  providers: [
    OverviewService,
    UsersService,
    GoalsService,
    ConversationsService,
  ],
})
export class AdminModule {}
