import { Module } from "@nestjs/common";

import { RoadmapModule } from "../roadmap/roadmap.module.js";
import { UsageModule } from "../usage/usage.module.js";
import { WeeklyTaskController } from "./weekly-task.controller.js";
import { WeeklyTaskService } from "./weekly-task.service.js";

@Module({
  imports: [RoadmapModule, UsageModule],
  controllers: [WeeklyTaskController],
  providers: [WeeklyTaskService],
  exports: [WeeklyTaskService],
})
export class WeeklyTaskModule {}
