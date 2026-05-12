import { Module } from "@nestjs/common";

import { RoadmapModule } from "../roadmap/roadmap.module.js";
import { UsageModule } from "../usage/usage.module.js";
import { TaskController } from "./task.controller.js";
import { TaskService } from "./task.service.js";

@Module({
  imports: [RoadmapModule, UsageModule],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
