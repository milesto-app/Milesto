import { Module } from "@nestjs/common";

import { GoalModule } from "../goal/goal.module.js";
import { DebriefController } from "./debrief.controller.js";
import { DebriefService } from "./debrief.service.js";
import { RerankService } from "./rerank.service.js";
import { RoadmapController } from "./roadmap.controller.js";
import { RoadmapService } from "./roadmap.service.js";
import { RoadmapContextService } from "./roadmap-context.service.js";
import { RoadmapDataService } from "./roadmap-data.service.js";
import { RoadmapGenerationService } from "./roadmap-generation.service.js";
import { RoadmapQualityService } from "./roadmap-quality.service.js";
import { SummaryEmbeddingService } from "./summary-embedding.service.js";
import { WeeklyPlanService } from "./weekly-plan.service.js";
import { WeeklyTaskController } from "./weekly-task.controller.js";
import { WeeklyTaskService } from "./weekly-task.service.js";

@Module({
  imports: [GoalModule],
  controllers: [RoadmapController, WeeklyTaskController, DebriefController],
  providers: [
    RoadmapContextService,
    RerankService,
    RoadmapGenerationService,
    RoadmapService,
    RoadmapDataService,
    DebriefService,
    WeeklyPlanService,
    WeeklyTaskService,
    SummaryEmbeddingService,
    RoadmapQualityService,
  ],
  exports: [
    RoadmapContextService,
    RerankService,
    RoadmapService,
    WeeklyPlanService,
    WeeklyTaskService,
    DebriefService,
  ],
})
export class RoadmapModule {}
