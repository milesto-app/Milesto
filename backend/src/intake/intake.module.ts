import { Module } from '@nestjs/common';
import { GoalModule } from '../goal/goal.module.js';
import { AdminController } from './admin.controller.js';
import { IntakeController } from './intake.controller.js';
import { IntakeBatchService } from './intake-batch.service.js';
import { IntakeProfileService } from './intake-profile.service.js';
import { IntakeEmbeddingService } from './intake-embedding.service.js';
import { IntakePromptService } from './intake-prompt.service.js';
import { IntakeQualityService } from './intake-quality.service.js';
import { IntakeStoreService } from './intake-store.service.js';
import { IntakeStoreQueryService } from './intake-store-query.service.js';
import { IntakeContextService } from './intake-context.service.js';
import { IntakeGenerationService } from './intake-generation.service.js';
import { IntakeReembedService } from './intake-reembed.service.js';
import { IntakeFallbackService } from './intake-fallback.service.js';
import { IntakeTargetDateService } from './intake-target-date.service.js';
import { IntakeProfileStoreService } from './intake-profile-store.service.js';

const PROVIDERS = [
  IntakeBatchService,
  IntakeProfileService,
  IntakeProfileStoreService,
  IntakeEmbeddingService,
  IntakePromptService,
  IntakeQualityService,
  IntakeStoreService,
  IntakeStoreQueryService,
  IntakeContextService,
  IntakeGenerationService,
  IntakeReembedService,
  IntakeFallbackService,
  IntakeTargetDateService,
];

@Module({
  imports: [GoalModule],
  controllers: [IntakeController, AdminController],
  providers: PROVIDERS,
  exports: [IntakeBatchService, IntakeProfileService, IntakePromptService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class IntakeModule {}
