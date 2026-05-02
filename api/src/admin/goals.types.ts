export interface AdminGoalSummary {
  id: string;
  userId: string;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  title: string;
  status: string;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminGoalList {
  goals: AdminGoalSummary[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface AdminGoalDetail {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: string;
  targetDate: string | null;
  userMotivationQuote: string | null;
  narrativeSummary: string | null;
  profileData: unknown;
  profileCreatedAt: string | null;
  profileGenerationAttempts: number;
  profileEmbedded: boolean;
  roadmapStatus: string | null;
  roadmapModelUsed: string | null;
  roadmapGenerationAttempts: number;
  roadmapCreatedAt: string | null;
  roadmapUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AdminIntakeQuestion {
  id: string;
  questionText: string;
  questionType: string;
  config: unknown;
  orderInBatch: number;
  answerText: string | null;
  answerNumeric: number | null;
  selectedOptions: unknown;
  answeredAt: string | null;
}

export interface AdminIntakeBatch {
  id: string;
  batchNumber: number;
  isAnswered: boolean;
  embedded: boolean;
  qualityScore: number | null;
  createdAt: string;
  questions: AdminIntakeQuestion[];
}

export interface AdminGoalMilestone {
  id: string;
  title: string;
  description: string;
  expectedOutcome: string;
  orderIndex: number;
  targetMonth: number;
  targetWeek: number;
  isMonthlyCheckpoint: boolean;
  completedAt: string | null;
}

export interface AdminGoalWeeklyPlan {
  id: string;
  milestoneId: string;
  weekNumber: number;
  weekStartDate: string;
  expectedEndDate: string | null;
  status: string;
  isFallback: boolean;
  modelUsed: string | null;
  objectives: unknown;
  summary: unknown;
  createdAt: string | null;
}

export interface AdminGoalRoadmap {
  status: string | null;
  modelUsed: string | null;
  generationAttempts: number;
  createdAt: string | null;
  updatedAt: string | null;
  milestones: AdminGoalMilestone[];
  weeklyPlans: AdminGoalWeeklyPlan[];
}

export interface AdminGoalWeeklyTask {
  id: string;
  weeklyPlanId: string;
  weekNumber: number;
  title: string;
  description: string;
  difficultyRating: string | null;
  orderIndex: number;
  isCompleted: boolean;
  isFallback: boolean;
  completedAt: string | null;
  createdAt: string | null;
}

export interface AdminGoalDebrief {
  id: string;
  weeklyPlanId: string | null;
  date: string;
  note: string;
  taskRatings: unknown;
  createdAt: string | null;
}

export interface AdminGoalCoachMemory {
  id: string;
  content: string;
  updatedAt: string;
}

export interface AdminGoalEmbedding {
  id: string;
  contentType: string;
  contentText: string;
  batchId: string | null;
  metadata: unknown;
  createdAt: string;
}
