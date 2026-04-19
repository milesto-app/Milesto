import { Module } from "@nestjs/common";

import { GoalModule } from "../goal/goal.module.js";
import { ContextPipelineService } from "./context-pipeline.service.js";
import { DebriefController } from "./debrief.controller.js";
import { DebriefService } from "./debrief.service.js";
import { GenerationService } from "./generation.service.js";
import { GenerationNarrativeService } from "./generation-narrative.service.js";
import { QualityMilestoneService } from "./quality-milestone.service.js";
import { QualityWeeklyService } from "./quality-weekly.service.js";
import { QualityWeeklyTaskService } from "./quality-weekly-task.service.js";
import { RerankService } from "./rerank.service.js";
import { RoadmapController } from "./roadmap.controller.js";
import { RoadmapService } from "./roadmap.service.js";
import { RoadmapStorageService } from "./roadmap-storage.service.js";
import { SummaryEmbeddingService } from "./summary-embedding.service.js";
import { WeeklyPlanService } from "./weekly-plan.service.js";
import { WeeklyPlanDataService } from "./weekly-plan-data.service.js";
import { WeeklyPlanQueryService } from "./weekly-plan-query.service.js";
import { WeeklyPlanStorageService } from "./weekly-plan-storage.service.js";
import { WeeklyTaskController } from "./weekly-task.controller.js";
import { WeeklyTaskService } from "./weekly-task.service.js";
import { WeeklyTaskStorageService } from "./weekly-task-storage.service.js";

@Module({
  imports: [GoalModule],
  controllers: [RoadmapController, WeeklyTaskController, DebriefController],
  providers: [
    ContextPipelineService,
    RerankService,
    GenerationService,
    GenerationNarrativeService,
    RoadmapService,
    RoadmapStorageService,
    DebriefService,
    WeeklyPlanService,
    WeeklyPlanDataService,
    WeeklyPlanQueryService,
    WeeklyPlanStorageService,
    WeeklyTaskService,
    WeeklyTaskStorageService,
    SummaryEmbeddingService,
    QualityMilestoneService,
    QualityWeeklyService,
    QualityWeeklyTaskService,
  ],
  exports: [
    ContextPipelineService,
    RerankService,
    RoadmapService,
    WeeklyPlanService,
    WeeklyTaskService,
    DebriefService,
  ],
})
export class RoadmapModule {}
