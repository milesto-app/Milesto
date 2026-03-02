import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseService } from '../supabase/supabase.service.js';
import { SUPABASE_UNIQUE_VIOLATION } from '../supabase/error-codes.js';
import type { Json } from '../supabase/database.types.js';
import type { Debrief } from './types/daily.types.js';
import type { SubmitDebriefDto } from './dto/submit-debrief.dto.js';

@Injectable()
export class DebriefService {
  private readonly logger = new Logger(DebriefService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  public async submitDebrief(
    goalId: string,
    userId: string,
    dto: SubmitDebriefDto,
  ): Promise<Debrief> {
    await this.validateGoalExists(goalId, userId);
    const today = new Date().toISOString().split('T')[0] ?? '';
    return this.insertDebrief(goalId, userId, today, dto);
  }

  public async getDebriefHistory(goalId: string, userId: string): Promise<Debrief[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('debriefs')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (error) {
      this.logger.error(`Failed to retrieve debrief history: ${error.message}`);
      throw new InternalServerErrorException('Failed to retrieve debrief history');
    }
    return data as unknown as Debrief[];
  }

  private async validateGoalExists(goalId: string, userId: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('goals')
      .select('id')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (error || data === null) {
      throw new NotFoundException('Goal not found');
    }
  }

  // eslint-disable-next-line max-params
  private async insertDebrief(
    goalId: string,
    userId: string,
    today: string,
    dto: SubmitDebriefDto,
  ): Promise<Debrief> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('debriefs')
      .insert({
        goal_id: goalId,
        user_id: userId,
        date: today,
        note: dto.note,
        task_ratings: (dto.task_ratings ?? []) as unknown as Json,
      })
      .select()
      .single();
    if (error) {
      if (error.code === SUPABASE_UNIQUE_VIOLATION) {
        throw new ConflictException('Debrief already submitted for this goal today');
      }
      this.logger.error(`Failed to store debrief: ${error.message}`);
      throw new InternalServerErrorException('Failed to store debrief');
    }
    this.eventEmitter.emit('debrief.submitted', {
      debriefId: (data as Record<string, unknown>).id,
      goalId,
      userId,
      note: dto.note,
    });
    return data as unknown as Debrief;
  }
}
