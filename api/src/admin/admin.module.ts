import { Module } from "@nestjs/common";

import { GoalsController } from "./goals.controller.js";
import { GoalsService } from "./goals.service.js";
import { OverviewController } from "./overview.controller.js";
import { OverviewService } from "./overview.service.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

@Module({
  controllers: [OverviewController, UsersController, GoalsController],
  providers: [OverviewService, UsersService, GoalsService],
})
export class AdminModule {}
