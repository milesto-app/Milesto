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
