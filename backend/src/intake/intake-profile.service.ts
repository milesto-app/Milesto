import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseService } from '../supabase/supabase.service.js';
import { appConfig } from '../config/app.config.js';
import { GoalService } from '../goal/goal.service.js';
import { IntakePromptService } from './intake-prompt.service.js';
import { IntakeQualityService } from './intake-quality.service.js';
import { IntakeContextService } from './intake-context.service.js';
import { buildProfileData } from './intake-profile-data.js';
import type { Json } from '../supabase/database.types.js';
import type { GoalProfile, PriorBatchContext } from './intake-prompt.service.js';
import type { ProfileGeneratedEvent, ProfileResult } from './types/intake.types.js';

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
  private readonly promptService!: IntakePromptService;

  @Inject()
  private readonly qualityService!: IntakeQualityService;

  @Inject()
  private readonly contextService!: IntakeContextService;

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
    if (goal.profile_generation_attempts >= appConfig.intake.maxProfileRetries) {
      throw new BadRequestException(
        `Maximum profile generation attempts (${String(appConfig.intake.maxProfileRetries)}) exceeded`,
      );
    }
    this.logger.log(
      `Retrying profile for goal ${goalId} (attempt ${String(goal.profile_generation_attempts + 1)}/${String(appConfig.intake.maxProfileRetries)})`,
    );
    const result = await this.generateAndStoreProfile(userId, goalId, goal.description);
    return { profile_id: result.profile_id, goal_status: result.profile_status };
  }

  public async generateAndStoreProfile(
    userId: string,
    goalId: string,
    goalDescription: string,
  ): Promise<ProfileResult> {
    try {
      await this.updateGoalStatus(goalId, 'profile_generating');
      const priorBatches = await this.contextService.loadPriorBatchContext(goalId);
      const profile = await this.tryGenerateProfile(goalId, goalDescription, priorBatches);
      if (profile === null) {
        return { profile_id: null, profile_status: FAILED_STATUS };
      }
      return await this.storeProfile(userId, goalId, profile);
    } catch (error) {
      this.logger.error(
        `Profile generation failed for goal ${goalId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.markFailure(goalId);
    }
  }

  private async tryGenerateProfile(
    goalId: string,
    goalDescription: string,
    priorBatches: PriorBatchContext[],
  ): Promise<GoalProfile | null> {
    let profile: GoalProfile;
    try {
      profile = await this.promptService.generateGoalProfile(goalDescription, priorBatches);
    } catch (error) {
      this.logger.error(
        `Profile AI call failed for goal ${goalId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.markFailure(goalId);
      return null;
    }
    const validation = this.qualityService.validateGoalProfile(profile);
    if (validation.valid) {
      return profile;
    }
    this.logger.warn(
      `Profile validation failed for goal ${goalId}: ${validation.errors.join(', ')}. Retrying...`,
    );
    return this.callAiWithValidation(goalId, goalDescription, priorBatches);
  }

  private async callAiWithValidation(
    goalId: string,
    goalDescription: string,
    priorBatches: PriorBatchContext[],
  ): Promise<GoalProfile | null> {
    try {
      const profile = await this.promptService.generateGoalProfile(goalDescription, priorBatches);
      const validation = this.qualityService.validateGoalProfile(profile);
      if (!validation.valid) {
        this.logger.error(
          `Profile validation failed after retry for goal ${goalId}: ${validation.errors.join(', ')}`,
        );
        await this.markFailure(goalId);
        return null;
      }
      return profile;
    } catch (error) {
      this.logger.error(
        `Profile retry AI call failed for goal ${goalId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.markFailure(goalId);
      return null;
    }
  }

  private async storeProfile(
    userId: string,
    goalId: string,
    profile: GoalProfile,
  ): Promise<ProfileResult> {
    const { data: inserted, error } = await this.supabaseService
      .getAdminClient()
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
      this.logger.error(`Failed to insert profile for goal ${goalId}: ${error.message}`);
      return this.markFailure(goalId);
    }
    await this.updateGoalStatus(goalId, 'intake_completed');
    this.logger.log(`Profile generated and stored for goal ${goalId}`);
    this.eventEmitter.emit('profile.generated', {
      goal_id: goalId,
      profile_id: inserted.id,
      user_id: userId,
    } satisfies ProfileGeneratedEvent);
    return { profile_id: inserted.id, profile_status: 'intake_completed' };
  }

  private async markFailure(goalId: string): Promise<ProfileResult> {
    const { error } = await this.supabaseService
      .getAdminClient()
      .from('goals')
      .update({ status: FAILED_STATUS, updated_at: new Date().toISOString() })
      .eq('id', goalId);
    if (error !== null) {
      this.logger.error(`Failed to update goal ${goalId} to ${FAILED_STATUS}: ${error.message}`);
    }
    return { profile_id: null, profile_status: FAILED_STATUS };
  }

  private async updateGoalStatus(goalId: string, status: string): Promise<void> {
    const { error } = await this.supabaseService
      .getAdminClient()
      .from('goals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', goalId);
    if (error !== null) {
      this.logger.error(`Failed to update goal ${goalId} status to ${status}: ${error.message}`);
      throw new Error(`Failed to update goal status: ${error.message}`);
    }
  }
}
