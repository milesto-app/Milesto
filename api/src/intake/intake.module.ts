import { Module } from "@nestjs/common";

import { GoalModule } from "../goal/goal.module.js";
import { AdminController } from "./admin.controller.js";
import { IntakeController } from "./intake.controller.js";
import { IntakeBatchService } from "./intake-batch.service.js";
import { IntakeDataService } from "./intake-data.service.js";
import { IntakeEmbeddingService } from "./intake-embedding.service.js";
import { IntakeGenerationService } from "./intake-generation.service.js";
import { IntakeProfileService } from "./intake-profile.service.js";
import { IntakeQualityService } from "./intake-quality.service.js";
import { IntakeReembedService } from "./intake-reembed.service.js";

@Module({
  imports: [GoalModule],
  controllers: [IntakeController, AdminController],
  providers: [
    IntakeBatchService,
    IntakeDataService,
    IntakeEmbeddingService,
    IntakeGenerationService,
    IntakeProfileService,
    IntakeQualityService,
    IntakeReembedService,
  ],
  exports: [IntakeBatchService, IntakeProfileService, IntakeReembedService],
})
export class IntakeModule {}
