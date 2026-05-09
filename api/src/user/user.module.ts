import { Module } from "@nestjs/common";

import { StatsController } from "./stats.controller.js";
import { StatsService } from "./stats.service.js";
import { UserController } from "./user.controller.js";
import { UserService } from "./user.service.js";

@Module({
  controllers: [UserController, StatsController],
  providers: [UserService, StatsService],
  exports: [UserService, StatsService],
})
export class UserModule {}
