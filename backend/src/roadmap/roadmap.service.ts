import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserLanguageService } from '../common/user-language.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { GoalService } from '../goal/goal.service.js';
import { ContextPipelineService } from './context-pipeline.service.js';
import { GenerationService } from './generation.service.js';
import { RoadmapStorageService } from './roadmap-storage.service.js';
import type {
  GoalData,
  MilestoneSummary,
  Roadmap,
} from './types/roadmap.types.js';

@Injectable()
export class RoadmapService {
  private readonly logger = new Logger(RoadmapService.name);

  // eslint-disable-next-line max-params
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly contextPipeline: ContextPipelineService,
    private readonly generation: GenerationService,
    private readonly goal: GoalService,
    private readonly events: EventEmitter2,
    private readonly roadmapStorage: RoadmapStorageService,
    private readonly languageService: UserLanguageService,
  ) {}

  public async generateMilestones(
    goalId: string,
    userId: string,
  ): Promise<Roadmap> {
    const goalData = await this.validateGoalStatus(goalId, userId);
    const roadmap = await this.roadmapStorage.acquireGenerationLock(
      goalId,
      userId,
    );

    try {
      const context = await this.contextPipeline.assembleContext(
        goalId,
        userId,
      );
      const fullGoalData = await this.buildGoalData(goalData, goalId, userId);
      const language = await this.languageService.getLanguage(userId);
      const { milestones, metadata } = await this.generation.generateMilestones(
        context,
        fullGoalData,
        language,
      );

      await this.roadmapStorage.storeMilestones(roadmap.id, goalId, milestones);
      await this.roadmapStorage.updateRoadmapStatus(
        roadmap.id,
        'complete',
        metadata,
      );
      await this.goal.updateStatus(goalId, 'active');

      this.events.emit('roadmap.generated', { roadmapId: roadmap.id, goalId });
      this.logger.log(
        `Roadmap generated for goal ${goalId}: ${String(milestones.length)} milestones`,
      );

      return await this.roadmapStorage.getRoadmap(goalId, userId);
    } catch (error) {
      await this.roadmapStorage.updateRoadmapStatus(
        roadmap.id,
        'failed',
        undefined,
      );
      throw error;
    }
  }

  public async getRoadmap(goalId: string, userId: string): Promise<Roadmap> {
    return this.roadmapStorage.getRoadmap(goalId, userId);
  }

  public async getMilestones(
    goalId: string,
    userId: string,
  ): Promise<MilestoneSummary[]> {
    return this.roadmapStorage.getMilestones(goalId, userId);
  }

  private async buildGoalData(
    goalData: GoalData,
    goalId: string,
    userId: string,
  ): Promise<GoalData> {
    let profileData: Record<string, unknown> | undefined;
    try {
      const supabase = this.supabaseService.getAdminClient();
      const { data: profile } = await supabase
        .from('goal_profiles')
        .select('profile_data')
        .eq('goal_id', goalId)
        .eq('user_id', userId)
        .single();
      profileData =
        (profile?.profile_data as Record<string, unknown> | null | undefined) ??
        undefined;
    } catch (error) {
      this.logger.warn(
        `Could not fetch goal profile for constraints: ${goalId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      id: goalData.id,
      title: goalData.title,
      description: goalData.description,
      status: goalData.status,
      ...(goalData.target_date !== undefined
        ? { target_date: goalData.target_date }
        : {}),
      ...(profileData !== undefined ? { profile_data: profileData } : {}),
    };
  }

  private async validateGoalStatus(
    goalId: string,
    userId: string,
  ): Promise<GoalData> {
    const foundGoal = await this.goal.findOne(userId, goalId);
    const GENERATION_ALLOWED_STATUSES = ['intake_completed', 'active'];
    if (!GENERATION_ALLOWED_STATUSES.includes(foundGoal.status)) {
      throw new BadRequestException(
        `Goal must be in intake_completed or active status, current: ${foundGoal.status}`,
      );
    }
    return foundGoal as GoalData;
  }
}
