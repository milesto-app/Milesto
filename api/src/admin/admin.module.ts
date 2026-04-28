import { Module } from "@nestjs/common";

import { OverviewController } from "./overview.controller.js";
import { OverviewService } from "./overview.service.js";

@Module({
  controllers: [OverviewController],
  providers: [OverviewService],
})
export class AdminModule {}
