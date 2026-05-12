import { Module } from "@nestjs/common";

import { GoalModule } from "../goal/goal.module.js";
import { UsageModule } from "../usage/usage.module.js";
import { MilestoneController } from "./milestone.controller.js";
import { MilestoneService } from "./milestone.service.js";
import { RoadmapController } from "./roadmap.controller.js";
import { RoadmapService } from "./roadmap.service.js";
import { RoadmapDataService } from "./roadmap-data.service.js";
import { RoadmapGenerationService } from "./roadmap-generation.service.js";
import { WeekStateService } from "./week-state.service.js";

@Module({
  imports: [GoalModule, UsageModule],
  controllers: [RoadmapController, MilestoneController],
  providers: [
    RoadmapGenerationService,
    RoadmapService,
    RoadmapDataService,
    WeekStateService,
    MilestoneService,
  ],
  exports: [
    RoadmapService,
    RoadmapDataService,
    RoadmapGenerationService,
    WeekStateService,
    MilestoneService,
  ],
})
export class RoadmapModule {}
