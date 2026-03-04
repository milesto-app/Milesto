import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { CheckInService } from '../roadmap/check-in.service.js';
import { DebriefService } from '../roadmap/debrief.service.js';
import type { EnergyLevel } from '../roadmap/types/daily.types.js';
import type { ToolExecutionContext } from './types/chat.types.js';

@Injectable()
export class ChatCheckInToolsService {
  private readonly logger = new Logger(ChatCheckInToolsService.name);

  constructor(
    private readonly checkInService: CheckInService,
    private readonly debriefService: DebriefService,
  ) {}

  public async submitCheckIn(
    args: Record<string, unknown>,
    ctx: ToolExecutionContext,
  ): Promise<unknown> {
    try {
      const energyLevel = args.energy_level as EnergyLevel;
      const note = typeof args.note === 'string' ? args.note : undefined;

      const checkIn = await this.checkInService.submitCheckIn(
        ctx.goalId,
        ctx.userId,
        {
          energy_level: energyLevel,
          ...(note !== undefined ? { note } : {}),
        },
      );

      return {
        success: true,
        date: checkIn.date,
        energy_level: checkIn.energy_level,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        return {
          error:
            'You have already checked in today. Only one check-in per day is allowed.',
        };
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`submitCheckIn failed: ${message}`);
      return { error: 'Unable to submit check-in. Please try again later.' };
    }
  }

  public async submitDebrief(
    args: Record<string, unknown>,
    ctx: ToolExecutionContext,
  ): Promise<unknown> {
    try {
      const note = args.note as string;

      const debrief = await this.debriefService.submitDebrief(
        ctx.goalId,
        ctx.userId,
        { note },
      );

      return {
        success: true,
        date: debrief.date,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        return {
          error:
            'You have already submitted a debrief today. Only one per day is allowed.',
        };
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`submitDebrief failed: ${message}`);
      return { error: 'Unable to submit debrief. Please try again later.' };
    }
  }
}
