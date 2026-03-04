import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { ProfileResult } from './types/intake.types.js';

const FAILED_STATUS = 'profile_generation_failed';

@Injectable()
export class IntakeProfileStoreService {
  private readonly logger = new Logger(IntakeProfileStoreService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async markFailure(goalId: string): Promise<ProfileResult> {
    const client = this.supabaseService.getAdminClient();
    const { error } = await client
      .from('goals')
      .update({ status: FAILED_STATUS, updated_at: new Date().toISOString() })
      .eq('id', goalId);
    if (error !== null) {
      this.logger.error(
        `Failed to update goal ${goalId} to ${FAILED_STATUS}: ${error.message}`,
      );
    }
    return { profile_id: null, profile_status: FAILED_STATUS };
  }

  public async updateGoalStatus(goalId: string, status: string): Promise<void> {
    const client = this.supabaseService.getAdminClient();
    const { error } = await client
      .from('goals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', goalId);
    if (error !== null) {
      this.logger.error(
        `Failed to update goal ${goalId} status to ${status}: ${error.message}`,
      );
      throw new Error(`Failed to update goal status: ${error.message}`);
    }
  }
}
