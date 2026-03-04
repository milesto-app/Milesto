import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { CheckIn, DailyObjective } from './types/daily.types.js';

const SUPABASE_NOT_FOUND_CODE = 'PGRST116';

interface StoreDailyObjectiveRow {
  title: string;
  description: string;
  order_index: number;
  difficulty_rating: string | null;
}

export interface StoreObjectivesParams {
  objectives: StoreDailyObjectiveRow[];
  weeklyPlanId: string;
  goalId: string;
  userId: string;
  date: string;
  isFallback: boolean;
}

export interface UpdateParams {
  objectiveId: string;
  goalId: string;
  userId: string;
  isCompleted: boolean;
}

@Injectable()
export class DailyObjectiveStorageService {
  private readonly logger = new Logger(DailyObjectiveStorageService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async getExistingObjectives(
    goalId: string,
    userId: string,
    date: string,
  ): Promise<DailyObjective[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('daily_objectives')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .eq('date', date)
      .order('order_index', { ascending: true });

    if (error) {
      this.logger.error(
        `Failed to query existing daily objectives: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve daily objectives',
      );
    }

    return data as DailyObjective[];
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
      if (error.code === SUPABASE_NOT_FOUND_CODE) {
        return null;
      }
      this.logger.error(`Failed to retrieve check-in: ${error.message}`);
      throw new InternalServerErrorException('Failed to retrieve check-in');
    }

    return data as CheckIn;
  }

  public async updateObjective(params: UpdateParams): Promise<DailyObjective> {
    const supabase = this.supabaseService.getAdminClient();

    const { error: findError } = await supabase
      .from('daily_objectives')
      .select('id')
      .eq('id', params.objectiveId)
      .eq('goal_id', params.goalId)
      .eq('user_id', params.userId)
      .single();

    if (findError !== null) {
      throw new NotFoundException('Daily objective not found');
    }

    const { data, error } = await supabase
      .from('daily_objectives')
      .update({ is_completed: params.isCompleted })
      .eq('id', params.objectiveId)
      .eq('goal_id', params.goalId)
      .eq('user_id', params.userId)
      .select()
      .single();

    if (error !== null) {
      this.logger.error(`Failed to update daily objective: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to update daily objective',
      );
    }

    return data as DailyObjective;
  }

  public async storeObjectives(
    params: StoreObjectivesParams,
  ): Promise<DailyObjective[]> {
    const supabase = this.supabaseService.getAdminClient();
    const rows = params.objectives.map((obj) => ({
      weekly_plan_id: params.weeklyPlanId,
      goal_id: params.goalId,
      user_id: params.userId,
      date: params.date,
      title: obj.title,
      description: obj.description,
      difficulty_rating: obj.difficulty_rating,
      order_index: obj.order_index,
      is_completed: false,
      is_fallback: params.isFallback,
    }));

    const { data, error } = await supabase
      .from('daily_objectives')
      .insert(rows)
      .select()
      .order('order_index', { ascending: true });

    if (error !== null) {
      this.logger.error(`Failed to store daily objectives: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to store daily objectives',
      );
    }

    return data as DailyObjective[];
  }

  public async getWeeklyCompletionRate(
    goalId: string,
    userId: string,
    weeklyPlanId: string,
  ): Promise<{ completed: number; total: number; rate: number }> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('daily_objectives')
      .select('is_completed')
      .eq('weekly_plan_id', weeklyPlanId)
      .eq('goal_id', goalId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error(
        `Failed to query weekly completion rate: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to query weekly completion rate',
      );
    }

    const total = data.length;
    const completed = data.filter(
      (d: { is_completed: boolean }) => d.is_completed,
    ).length;
    const rate = total === 0 ? 0 : completed / total;

    return { completed, total, rate };
  }
}
