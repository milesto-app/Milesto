import { Injectable, Logger } from '@nestjs/common';

import { RoadmapService } from '../roadmap/roadmap.service.js';
import type { ToolExecutionContext } from './types/chat.types.js';

@Injectable()
export class ChatRoadmapToolsService {
  private readonly logger = new Logger(ChatRoadmapToolsService.name);

  constructor(private readonly roadmapService: RoadmapService) {}

  public async getRoadmap(ctx: ToolExecutionContext): Promise<unknown> {
    try {
      const roadmap = await this.roadmapService.getRoadmap(
        ctx.goalId,
        ctx.userId,
      );

      return {
        status: roadmap.status,
        current_milestone_id: roadmap.current_milestone_id ?? null,
        milestones: (roadmap.milestones ?? []).map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          expected_outcome: m.expected_outcome,
          target_month: m.target_month,
          target_week: m.target_week,
          is_monthly_checkpoint: m.is_monthly_checkpoint,
          order_index: m.order_index,
        })),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`getRoadmap failed: ${message}`);
      return {
        error:
          'Unable to fetch roadmap. The goal may not have a generated roadmap yet.',
      };
    }
  }
}
