import { Module } from "@nestjs/common";

import { GoalModule } from "../goal/goal.module.js";
import { UsageModule } from "../usage/usage.module.js";
import { MilestoneController } from "./milestone.controller.js";
import { MilestoneService } from "./milestone.service.js";
import { RerankService } from "./rerank.service.js";
import { RoadmapController } from "./roadmap.controller.js";
import { RoadmapService } from "./roadmap.service.js";
import { RoadmapContextService } from "./roadmap-context.service.js";
import { RoadmapDataService } from "./roadmap-data.service.js";
import { RoadmapGenerationService } from "./roadmap-generation.service.js";
import { SummaryEmbeddingService } from "./summary-embedding.service.js";
import { WeekStateService } from "./week-state.service.js";

@Module({
  imports: [GoalModule, UsageModule],
  controllers: [RoadmapController, MilestoneController],
  providers: [
    RoadmapContextService,
    RerankService,
    RoadmapGenerationService,
    RoadmapService,
    RoadmapDataService,
    WeekStateService,
    MilestoneService,
    SummaryEmbeddingService,
  ],
  exports: [
    RoadmapContextService,
    RerankService,
    RoadmapService,
    RoadmapDataService,
    RoadmapGenerationService,
    WeekStateService,
    MilestoneService,
  ],
})
export class RoadmapModule {}
