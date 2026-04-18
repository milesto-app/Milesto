export interface MilestoneQualityScores {
  coherence: number;
  personalization: number;
  progression: number;
  deadline_alignment: number;
  composite: number;
}

export interface WeeklyPlanQualityScores {
  milestone_alignment: number;
  progress_adaptation: number;
  actionability: number;
  composite: number;
}

export interface WeeklyTaskQualityScores {
  weekly_plan_alignment: number;
  specificity: number;
  achievability: number;
  composite: number;
}

export type GenerationType = 'milestone' | 'weekly_plan' | 'weekly_task';

export interface RoadmapGeneratedEvent {
  goalId: string;
}

export interface WeeklyPlanGeneratedEvent {
  planId: string;
  goalId: string;
}

export interface WeeklyTasksGeneratedEvent {
  goalId: string;
  weeklyPlanId: string;
}
