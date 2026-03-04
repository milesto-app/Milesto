import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { config } from '../config/app.config.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type {
  GenerationMetadata,
  MilestoneSummary,
  Roadmap,
} from './types/roadmap.types.js';

@Injectable()
export class RoadmapStorageService {
  private readonly logger = new Logger(RoadmapStorageService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async getRoadmap(goalId: string, userId: string): Promise<Roadmap> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: roadmap, error } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .single();
    if (error) {
      throw new NotFoundException('Roadmap not found');
    }
    const { data: milestones } = await supabase
      .from('milestones')
      .select('*')
      .eq('roadmap_id', roadmap.id)
      .order('order_index', { ascending: true });
    const { data: activePlan } = await supabase
      .from('weekly_plans')
      .select('milestone_id')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();
    return {
      ...roadmap,
      milestones: milestones ?? [],
      current_milestone_id: activePlan?.milestone_id ?? null,
    } as Roadmap;
  }

  public async getMilestones(
    goalId: string,
    userId: string,
  ): Promise<MilestoneSummary[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: roadmap, error: roadmapError } = await supabase
      .from('roadmaps')
      .select('id')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .single();
    if (roadmapError) {
      throw new NotFoundException('Roadmap not found');
    }
    const { data, error } = await supabase
      .from('milestones')
      .select(
        'id, title, description, expected_outcome, target_month, order_index',
      )
      .eq('roadmap_id', roadmap.id)
      .order('order_index', { ascending: true });
    if (error) {
      throw new NotFoundException('Milestones not found');
    }
    return data as MilestoneSummary[];
  }

  public async acquireGenerationLock(
    goalId: string,
    userId: string,
  ): Promise<Roadmap> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: existing } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('goal_id', goalId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (existing === null || existing === undefined) {
      return this.createNewRoadmap(supabase, goalId, userId);
    }

    return this.lockExistingRoadmap(supabase, existing);
  }

  public async storeMilestones(
    roadmapId: string,
    goalId: string,
    milestones: Array<{
      title: string;
      description: string;
      expected_outcome: string;
      target_month: number;
      order_index: number;
    }>,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const rows = milestones.map((m) => ({
      roadmap_id: roadmapId,
      goal_id: goalId,
      title: m.title,
      description: m.description,
      expected_outcome: m.expected_outcome,
      target_month: m.target_month,
      order_index: m.order_index,
    }));
    const { error } = await supabase.from('milestones').insert(rows);
    if (error) {
      throw new InternalServerErrorException(
        `Failed to store milestones: ${error.message}`,
      );
    }
  }

  public async updateRoadmapStatus(
    roadmapId: string,
    status: string,
    metadata: GenerationMetadata | undefined,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (metadata !== undefined) {
      updateData.model_used = metadata.model_used;
      updateData.generation_metadata = metadata;
    }
    const { error } = await supabase
      .from('roadmaps')
      .update(updateData)
      .eq('id', roadmapId);
    if (error) {
      this.logger.warn(
        `Failed to update roadmap ${roadmapId} status to ${status}: ${error.message}`,
      );
      if (status !== 'failed') {
        throw new InternalServerErrorException(
          `Failed to update roadmap status to ${status}: ${error.message}`,
        );
      }
    }
  }

  private async createNewRoadmap(
    supabase: ReturnType<SupabaseService['getAdminClient']>,
    goalId: string,
    userId: string,
  ): Promise<Roadmap> {
    const { data, error } = await supabase
      .from('roadmaps')
      .insert({ goal_id: goalId, user_id: userId, status: 'generating' })
      .select()
      .single();
    if (error) {
      throw new ConflictException('Failed to create roadmap');
    }
    return data as Roadmap;
  }

  private async lockExistingRoadmap(
    supabase: ReturnType<SupabaseService['getAdminClient']>,
    existing: Record<string, unknown>,
  ): Promise<Roadmap> {
    if (existing.status === 'complete') {
      throw new BadRequestException('Roadmap already generated');
    }
    if (existing.status === 'generating') {
      throw new ConflictException('Roadmap generation already in progress');
    }
    if (
      (existing.generation_attempts as number) >=
      config.roadmap.maxGenerationAttempts
    ) {
      throw new BadRequestException('Maximum generation attempts exceeded');
    }
    const { data, error } = await supabase
      .from('roadmaps')
      .update({
        status: 'generating',
        generation_attempts: (existing.generation_attempts as number) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id as string)
      .neq('status', 'generating')
      .select()
      .single();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
    if (data === null || error) {
      throw new ConflictException('Roadmap generation already in progress');
    }
    return data as Roadmap;
  }
}
