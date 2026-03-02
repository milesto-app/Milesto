import { Injectable, Logger } from '@nestjs/common';
import { DailyObjectiveService } from '../roadmap/daily-objective.service.js';
import { WeeklyPlanService } from '../roadmap/weekly-plan.service.js';
import { RoadmapService } from '../roadmap/roadmap.service.js';
import type { ToolExecutionContext } from './types/chat.types.js';

@Injectable()
export class ChatToolsService {
  private readonly logger = new Logger(ChatToolsService.name);

  constructor(
    private readonly dailyObjectiveService: DailyObjectiveService,
    private readonly weeklyPlanService: WeeklyPlanService,
    private readonly roadmapService: RoadmapService,
  ) {}

  public async getDailyObjectives(ctx: ToolExecutionContext): Promise<unknown> {
    try {
      const objectives = await this.dailyObjectiveService.getDailyObjectives(
        ctx.goalId,
        ctx.userId,
      );

      return objectives.map((obj) => ({
        title: obj.title,
        description: obj.description,
        is_completed: obj.is_completed,
        difficulty_rating: obj.difficulty_rating,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`getDailyObjectives failed: ${message}`);
      return { error: 'No daily objectives available. Complete your morning check-in first.' };
    }
  }

  public async getWeeklyPlan(ctx: ToolExecutionContext): Promise<unknown> {
    try {
      const plan = await this.weeklyPlanService.getCurrentWeeklyPlan(ctx.goalId, ctx.userId);

      if (plan === null) {
        return { error: 'No active weekly plan found. Generate a weekly plan first.' };
      }

      return {
        focus: plan.focus,
        week_number: plan.week_number,
        objectives: plan.objectives,
        status: plan.status,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`getWeeklyPlan failed: ${message}`);
      return { error: 'Unable to fetch weekly plan.' };
    }
  }

  public async getMilestones(ctx: ToolExecutionContext): Promise<unknown> {
    try {
      const milestones = await this.roadmapService.getMilestones(ctx.goalId, ctx.userId);

      return milestones.map((m) => ({
        title: m.title,
        description: m.description,
        expected_outcome: m.expected_outcome,
        target_month: m.target_month,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`getMilestones failed: ${message}`);
      return { error: 'Unable to fetch milestones. A roadmap may not have been generated yet.' };
    }
  }
}
