import { Module } from "@nestjs/common";

import { OverviewController } from "./overview.controller.js";
import { OverviewService } from "./overview.service.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

@Module({
  controllers: [OverviewController, UsersController],
  providers: [OverviewService, UsersService],
})
export class AdminModule {}
