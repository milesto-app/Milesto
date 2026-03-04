import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { UserLanguageService } from '../common/user-language.service.js';
import { config } from '../config/app.config.js';
import { GoalService } from '../goal/goal.service.js';
import type { Json } from '../supabase/database.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { IntakeContextService } from './intake-context.service.js';
import { buildProfileData } from './intake-profile-data.js';
import { IntakeProfileStoreService } from './intake-profile-store.service.js';
import type { GoalProfile } from './intake-prompt.service.js';
import { IntakePromptService } from './intake-prompt.service.js';
import { IntakeQualityService } from './intake-quality.service.js';
import type {
  ProfileGeneratedEvent,
  ProfileGenParams,
  ProfileResult,
  StoreProfileParams,
} from './types/intake.types.js';

const FAILED_STATUS = 'profile_generation_failed';

@Injectable()
export class IntakeProfileService {
  private readonly logger = new Logger(IntakeProfileService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly goalService: GoalService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
  ) {}

  @Inject()
  private readonly languageService!: UserLanguageService;

  @Inject()
  private readonly promptService!: IntakePromptService;

  @Inject()
  private readonly qualityService!: IntakeQualityService;

  @Inject()
  private readonly contextService!: IntakeContextService;

  @Inject()
  private readonly profileStore!: IntakeProfileStoreService;

  public async retryProfile(
    userId: string,
    goalId: string,
  ): Promise<{ profile_id: string | null; goal_status: string }> {
    const goal = await this.goalService.findOne(userId, goalId);
    if (goal.status !== FAILED_STATUS) {
      throw new BadRequestException(
        'Profile retry is only available for goals with failed profile generation',
      );
    }
    if (goal.profile_generation_attempts >= config.intake.maxProfileRetries) {
      throw new BadRequestException(
        `Maximum profile generation attempts (${String(config.intake.maxProfileRetries)}) exceeded`,
      );
    }
    this.logger.log(
      `Retrying profile for goal ${goalId} (attempt ${String(goal.profile_generation_attempts + 1)}/${String(config.intake.maxProfileRetries)})`,
    );
    const language = await this.languageService.getLanguage(userId);
    const result = await this.generateAndStoreProfile({
      userId,
      goalId,
      goalDescription: goal.description,
      language,
    });
    return {
      profile_id: result.profile_id,
      goal_status: result.profile_status,
    };
  }

  public async generateAndStoreProfile(
    params: StoreProfileParams,
  ): Promise<ProfileResult> {
    try {
      await this.profileStore.updateGoalStatus(
        params.goalId,
        'profile_generating',
      );
      const priorBatches = await this.contextService.loadPriorBatchContext(
        params.goalId,
      );
      const genParams: ProfileGenParams = { ...params, priorBatches };
      const profile = await this.tryGenerateProfile(genParams);
      if (profile === null) {
        return { profile_id: null, profile_status: FAILED_STATUS };
      }
      return await this.storeProfile(params.userId, params.goalId, profile);
    } catch (error) {
      this.logger.error(
        `Profile generation failed for goal ${params.goalId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.profileStore.markFailure(params.goalId);
    }
  }

  private async tryGenerateProfile(
    params: ProfileGenParams,
  ): Promise<GoalProfile | null> {
    let profile: GoalProfile;
    try {
      profile = await this.promptService.generateGoalProfile(
        params.goalDescription,
        params.priorBatches,
        params.language,
      );
    } catch (error) {
      this.logger.error(
        `Profile AI call failed for goal ${params.goalId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.profileStore.markFailure(params.goalId);
      return null;
    }
    const validation = this.qualityService.validateGoalProfile(profile);
    if (validation.valid) {
      return profile;
    }
    this.logger.warn(
      `Profile validation failed for goal ${params.goalId}: ${validation.errors.join(', ')}. Retrying...`,
    );
    return this.callAiWithValidation(params);
  }

  private async callAiWithValidation(
    params: ProfileGenParams,
  ): Promise<GoalProfile | null> {
    try {
      const profile = await this.promptService.generateGoalProfile(
        params.goalDescription,
        params.priorBatches,
        params.language,
      );
      const validation = this.qualityService.validateGoalProfile(profile);
      if (!validation.valid) {
        this.logger.error(
          `Profile validation failed after retry for goal ${params.goalId}: ${validation.errors.join(', ')}`,
        );
        await this.profileStore.markFailure(params.goalId);
        return null;
      }
      return profile;
    } catch (error) {
      this.logger.error(
        `Profile retry AI call failed for goal ${params.goalId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.profileStore.markFailure(params.goalId);
      return null;
    }
  }

  private async storeProfile(
    userId: string,
    goalId: string,
    profile: GoalProfile,
  ): Promise<ProfileResult> {
    const client = this.supabaseService.getAdminClient();
    const { data: inserted, error } = await client
      .from('goal_profiles')
      .insert({
        goal_id: goalId,
        user_id: userId,
        profile_data: buildProfileData(profile) as Json,
        narrative_summary: profile.narrative_summary,
      })
      .select()
      .single();
    if (error !== null) {
      this.logger.error(
        `Failed to insert profile for goal ${goalId}: ${error.message}`,
      );
      return this.profileStore.markFailure(goalId);
    }
    await this.profileStore.updateGoalStatus(goalId, 'intake_completed');
    this.logger.log(`Profile generated and stored for goal ${goalId}`);
    this.eventEmitter.emit('profile.generated', {
      goal_id: goalId,
      profile_id: inserted.id,
      user_id: userId,
    } satisfies ProfileGeneratedEvent);
    return { profile_id: inserted.id, profile_status: 'intake_completed' };
  }
}
