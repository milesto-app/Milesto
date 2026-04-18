import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import type { CoachConfig, PublicCoach } from './coaches.config.js';
import { COACH_BY_ID, COACHES } from './coaches.config.js';

@Injectable()
export class CoachService {
  private readonly logger = new Logger(CoachService.name);

  public listCoaches(): CoachConfig[] {
    return [...COACHES];
  }

  public getCoach(coachId: number): CoachConfig {
    const coach = COACH_BY_ID.get(coachId);

    if (coach === undefined) {
      this.logger.warn(`Coach with id ${String(coachId)} not found`);
      throw new NotFoundException(`Coach with id ${String(coachId)} not found`);
    }

    return coach;
  }

  public listPublicCoaches(): PublicCoach[] {
    return this.listCoaches().map((coach) => this.toPublic(coach));
  }

  public getPublicCoach(coachId: number): PublicCoach {
    return this.toPublic(this.getCoach(coachId));
  }

  private toPublic(coach: CoachConfig): PublicCoach {
    return {
      id: coach.id,
      personality: coach.personality,
      displayName: coach.displayName,
      description: coach.description,
      icon: coach.icon,
    };
  }
}
