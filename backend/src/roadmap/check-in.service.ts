import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import {
  SUPABASE_NOT_FOUND,
  SUPABASE_UNIQUE_VIOLATION,
} from '../supabase/error-codes.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { SubmitCheckInDto } from './dto/submit-check-in.dto.js';
import type { CheckIn } from './types/daily.types.js';

@Injectable()
export class CheckInService {
  private readonly logger = new Logger(CheckInService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async submitCheckIn(
    goalId: string,
    userId: string,
    dto: SubmitCheckInDto,
  ): Promise<CheckIn> {
    await this.validateRoadmapActive(goalId, userId);
    const today = new Date().toISOString().split('T')[0] ?? '';
    return this.insertCheckIn(goalId, userId, today, dto);
  }

  public async getCheckIn(
    goalId: string,
    userId: string,
    date: string,
  ): Promise<CheckIn | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .eq('date', date)
      .single();
    if (error) {
      if (error.code === SUPABASE_NOT_FOUND) {
        return null;
      }
      this.logger.error(`Failed to retrieve check-in: ${error.message}`);
      throw new InternalServerErrorException('Failed to retrieve check-in');
    }
    return data as CheckIn;
  }

  private async validateRoadmapActive(
    goalId: string,
    userId: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: roadmap, error } = await supabase
      .from('roadmaps')
      .select('status')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (error || roadmap === null) {
      throw new NotFoundException('No roadmap found for this goal');
    }
    if (roadmap.status !== 'complete') {
      throw new BadRequestException('Goal has no active roadmap');
    }
  }

  private async insertCheckIn(
    goalId: string,
    userId: string,
    today: string,
    dto: SubmitCheckInDto,
  ): Promise<CheckIn> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('check_ins')
      .insert({
        goal_id: goalId,
        user_id: userId,
        date: today,
        energy_level: dto.energy_level,
        note: dto.note ?? null,
      })
      .select()
      .single();
    if (error) {
      if (error.code === SUPABASE_UNIQUE_VIOLATION) {
        throw new ConflictException(
          'Check-in already submitted for this goal today',
        );
      }
      this.logger.error(`Failed to store check-in: ${error.message}`);
      throw new InternalServerErrorException('Failed to store check-in');
    }
    this.logger.log(
      `Check-in submitted for goal ${goalId}, energy: ${dto.energy_level}`,
    );
    return data as CheckIn;
  }
}
