import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service.js';
import type { Coach } from './coach.types.js';

@Injectable()
export class CoachService {
  private readonly logger = new Logger(CoachService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async listCoaches(): Promise<Coach[]> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: true });

    if (error) {
      this.logger.error(`Failed to list coaches: ${error.message}`);
      throw new NotFoundException('Failed to list coaches');
    }

    return data as Coach[];
  }

  public async getCoach(coachId: number): Promise<Coach> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('id', coachId)
      .eq('is_active', true)
      .single();

    if (error) {
      throw new NotFoundException(`Coach with id ${String(coachId)} not found`);
    }

    return data as Coach;
  }
}
