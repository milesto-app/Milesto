// Mirrored from api/src/admin/*.types.ts. Cross-package type imports were
// rejected because the API uses NodeNext .js suffixes outside web's tsconfig
// include, and pulling them in via transpilePackages/rootDirs adds more risk
// than value. Keep this file in sync when API response shapes change. See
// plan §7 risk #1 and the existing root `types:sync` script as precedent.

// --- overview.types.ts ---

export interface OverviewStats {
  totalUsers: number;
  activeGoals: number;
  proSubscriptions: number;
  todayGenerations: number;
}

export interface RecentGoalSummary {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  userId: string;
  userName: string;
}

export interface RecentSignupSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
}

export interface ActivityTimelineEntry {
  date: string;
  signups: number;
  goals: number;
  messages: number;
}

// --- users.types.ts ---

export interface AdminUserSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  subscriptionStatus: string;
  coachId: number | null;
  createdAt: string;
}

export interface AdminUserList {
  users: AdminUserSummary[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  language: string | null;
  timezone: string | null;
  dateOfBirth: string | null;
  coachId: number | null;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  createdAt: string;
  goalCount: number;
}

export interface AdminUserGoal {
  id: string;
  title: string;
  status: string;
  targetDate: string | null;
  createdAt: string;
  milestoneCount: number;
  totalTasks: number;
  completedTasks: number;
}

export interface AdminUserUsageEntry {
  id: string;
  generationType: string;
  usageDate: string;
  createdAt: string;
}

export interface AdminUserUsage {
  totalGenerations: number;
  byType: Record<string, number>;
  recent: AdminUserUsageEntry[];
}

export interface AdminUserSubscription {
  status: string;
  expiresAt: string | null;
  productId: string | null;
  environment: string | null;
  autoRenewStatus: boolean | null;
  originalTransactionId: string | null;
  appleSignedAt: string | null;
  verifiedAt: string | null;
}

export interface AdminUserDevice {
  id: string;
  platform: string;
  environment: string;
  tokenLast4: string;
  createdAt: string;
  updatedAt: string;
}

// --- admin-usage.types.ts ---

export interface AdminUsageDailyEntry {
  date: string;
  counts: Record<string, number>;
}

export interface AdminUsageDaily {
  days: AdminUsageDailyEntry[];
}

export type AdminUsageTotals = Record<string, number>;

export interface AdminUsageByTypeEntry {
  type: string;
  count: number;
}

export interface AdminUsageTopUser {
  userId: string;
  name: string;
  count: number;
}

export interface AdminUsageCostByModel {
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
}

export interface AdminUsageCostEstimate {
  totalCostUsd: number;
  byModel: Record<string, AdminUsageCostByModel>;
  coverageRatio: number;
}

// --- system.types.ts ---

export interface AdminHealthCheck {
  status: "healthy" | "unhealthy";
  responseTimeMs: number;
}

export interface AdminHealthReport {
  backend: AdminHealthCheck;
  supabase: AdminHealthCheck;
  queueDepth: number | null;
}

// --- subscriptions.types.ts ---

export type AdminSubscriptionDistribution = Record<string, number>;

export interface AdminSubscriptionSummary {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  productId: string | null;
  environment: string | null;
  autoRenewStatus: boolean | null;
  expiresAt: string | null;
  verifiedAt: string | null;
  appleSignedAt: string | null;
  originalTransactionId: string | null;
}

export interface AdminSubscriptionList {
  subscriptions: AdminSubscriptionSummary[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface AdminSubscriptionProductBreakdown {
  count: number;
  mrr: number;
  arr: number;
}

export interface AdminSubscriptionMrrArr {
  mrr: number;
  arr: number;
  byProduct: Record<string, AdminSubscriptionProductBreakdown>;
}

export interface AdminSubscriptionChurn {
  windowDays: number;
  churned: number;
  retained: number;
  churnRate: number;
}

export interface AdminSubscriptionEvent {
  notificationUuid: string;
  notificationType: string;
  subtype: string | null;
  receivedAt: string;
}

export interface AdminSubscriptionEventList {
  events: AdminSubscriptionEvent[];
}

// --- goals.types.ts ---

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

export interface AdminGoalIntakeBatch {
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

// --- coaches.types.ts ---

export interface AdminCoachSummary {
  id: number;
  personality: string;
  displayName: { en: string; fr: string };
  description: { en: string; fr: string };
  icon: string;
  userCount: number;
}

export interface AdminCoachUserSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  subscriptionStatus: string;
  createdAt: string;
}

export interface AdminCoachUserList {
  users: AdminCoachUserSummary[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

// --- conversations.types.ts ---

export type AdminMessageRole = "user" | "assistant" | "tool";

export interface AdminConversationSummary {
  id: string;
  userId: string;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  goalId: string;
  goalTitle: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminConversationList {
  conversations: AdminConversationSummary[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface AdminMessage {
  id: string;
  conversationId: string;
  role: AdminMessageRole;
  content: string | null;
  toolCalls: unknown;
  toolCallId: string | null;
  toolName: string | null;
  createdAt: string;
}

export interface AdminMessageRoleCounts {
  user: number;
  assistant: number;
  tool: number;
}

export interface AdminMessageDayBucket {
  date: string;
  total: number;
  byRole: AdminMessageRoleCounts;
}

export interface AdminMessageStats {
  days: AdminMessageDayBucket[];
  toolBreakdown: Record<string, number>;
  totals: {
    total: number;
    byRole: AdminMessageRoleCounts;
  };
}

// --- notifications.types.ts ---

export interface AdminNotificationSend {
  id: string;
  userId: string;
  title: string;
  body: string;
  sentAt: string;
}

export interface AdminNotificationSendList {
  sends: AdminNotificationSend[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface AdminNotificationDevice {
  id: string;
  userId: string;
  platform: string;
  environment: string;
  tokenLast4: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNotificationDeviceList {
  devices: AdminNotificationDevice[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface AdminBroadcastResult {
  queued: boolean;
  recipientCount: number;
}

export type AdminBroadcastSegment = "all" | "pro";

export interface AdminSchedulerStatus {
  isRunning: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastBatchSize: number;
}

// --- intake.types.ts ---

export interface AdminIntakeBatch {
  id: string;
  goalId: string;
  batchNumber: number;
  isAnswered: boolean;
  qualityScore: number | null;
  embedded: boolean;
  createdAt: string;
  questionCount: number;
  answeredCount: number;
}

export interface AdminIntakeBatchList {
  batches: AdminIntakeBatch[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface AdminIntakeQualityFailures {
  batches: AdminIntakeBatch[];
  threshold: number;
}

// --- system.types.ts (extension) ---

export interface AdminLlmProbe {
  status: "healthy" | "unhealthy";
  latencyMs: number;
  model?: string;
  error?: string;
}

export interface AdminLlmHealthReport {
  openrouter: AdminLlmProbe;
  cohere: AdminLlmProbe;
}

export type AdminLogLevel = "warn" | "error";

export interface AdminSystemLog {
  id: string;
  level: string;
  context: string | null;
  message: string;
  stack: string | null;
  metadata: unknown;
  loggedAt: string;
}

// --- meta.types.ts ---

export interface AdminMe {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
}

export interface AdminListEntry {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
}

export interface AdminListResponse {
  admins: AdminListEntry[];
}

export interface AdminRoleUpdate {
  id: string;
  email: string;
  role: string;
}
