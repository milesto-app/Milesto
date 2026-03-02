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

export interface DailyObjectiveQualityScores {
  energy_calibration: number;
  specificity: number;
  achievability: number;
  composite: number;
}

export type GenerationType = 'milestone' | 'weekly_plan' | 'daily_objective';

export interface RoadmapGeneratedEvent {
  roadmapId: string;
  goalId: string;
}

export interface WeeklyPlanGeneratedEvent {
  planId: string;
  goalId: string;
}

export interface DailyObjectivesGeneratedEvent {
  goalId: string;
  date: string;
}
