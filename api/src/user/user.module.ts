import { Module } from "@nestjs/common";

import { ProfileController } from "./profile.controller.js";
import { ProfileService } from "./profile.service.js";
import { StatsController } from "./stats.controller.js";
import { StatsService } from "./stats.service.js";

@Module({
  controllers: [ProfileController, StatsController],
  providers: [ProfileService, StatsService],
  exports: [ProfileService, StatsService],
})
export class UserModule {}
