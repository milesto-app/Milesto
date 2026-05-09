import { Module } from "@nestjs/common";

import { UsageModule } from "../usage/usage.module.js";
import { GoalController } from "./goal.controller.js";
import { GoalService } from "./goal.service.js";

@Module({
  imports: [UsageModule],
  controllers: [GoalController],
  providers: [GoalService],
  exports: [GoalService],
})
export class GoalModule {}
