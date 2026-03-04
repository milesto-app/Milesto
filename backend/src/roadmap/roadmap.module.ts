import { Module } from '@nestjs/common';
import { GoalModule } from '../goal/goal.module.js';
import { ContextPipelineService } from './context-pipeline.service.js';
import { RerankService } from './rerank.service.js';
import { GenerationService } from './generation.service.js';
import { GenerationNarrativeService } from './generation-narrative.service.js';
import { RoadmapService } from './roadmap.service.js';
import { RoadmapStorageService } from './roadmap-storage.service.js';
import { CheckInService } from './check-in.service.js';
import { DebriefService } from './debrief.service.js';
import { WeeklyPlanService } from './weekly-plan.service.js';
import { WeeklyPlanDataService } from './weekly-plan-data.service.js';
import { WeeklyPlanQueryService } from './weekly-plan-query.service.js';
import { WeeklyPlanStorageService } from './weekly-plan-storage.service.js';
import { DailyObjectiveService } from './daily-objective.service.js';
import { DailyObjectiveStorageService } from './daily-objective-storage.service.js';
import { SummaryEmbeddingService } from './summary-embedding.service.js';
import { QualityMilestoneService } from './quality-milestone.service.js';
import { QualityWeeklyService } from './quality-weekly.service.js';
import { QualityDailyService } from './quality-daily.service.js';
import { RoadmapController } from './roadmap.controller.js';
import { CheckInController } from './check-in.controller.js';
import { DailyObjectiveController } from './daily-objective.controller.js';
import { DebriefController } from './debrief.controller.js';

@Module({
  imports: [GoalModule],
  controllers: [
    RoadmapController,
    CheckInController,
    DailyObjectiveController,
    DebriefController,
  ],
  providers: [
    ContextPipelineService,
    RerankService,
    GenerationService,
    GenerationNarrativeService,
    RoadmapService,
    RoadmapStorageService,
    CheckInService,
    DebriefService,
    WeeklyPlanService,
    WeeklyPlanDataService,
    WeeklyPlanQueryService,
    WeeklyPlanStorageService,
    DailyObjectiveService,
    DailyObjectiveStorageService,
    SummaryEmbeddingService,
    QualityMilestoneService,
    QualityWeeklyService,
    QualityDailyService,
  ],
  exports: [
    ContextPipelineService,
    RerankService,
    RoadmapService,
    WeeklyPlanService,
    DailyObjectiveService,
    CheckInService,
    DebriefService,
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class RoadmapModule {}
