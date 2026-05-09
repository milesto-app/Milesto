import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";

import { config } from "../config/app.config.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import type {
  AdminUsageByTypeEntry,
  AdminUsageCostByModel,
  AdminUsageCostEstimate,
  AdminUsageDaily,
  AdminUsageDailyEntry,
  AdminUsageTopUser,
  AdminUsageTotals,
} from "./admin-usage.types.js";

const TOKENS_PER_MILLION = 1_000_000;
const UNPRICED_MODEL_KEY = "unpriced";
const UNKNOWN_USER_NAME = "Unknown";

interface UsageRow {
  user_id: string;
  generation_type: string;
  usage_date: string;
}

interface CostRow {
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
}

@Injectable()
export class AdminUsageService {
  private readonly logger = new Logger(AdminUsageService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async getDaily(
    days: number,
    type: string | undefined,
  ): Promise<AdminUsageDaily> {
    const { sinceDate, todayDate } = computeWindow(days);
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from("generation_usage")
      .select("usage_date, generation_type")
      .gte("usage_date", toDateString(sinceDate))
      .lte("usage_date", toDateString(todayDate));

    if (type !== undefined && type !== "") {
      query = query.eq("generation_type", type);
    }

    const { data, error } = await query;
    if (error !== null) {
      this.logger.error(`Failed to load daily usage: ${error.message}`);
      throw new InternalServerErrorException("Failed to load usage");
    }

    const dailyMap = new Map<string, Record<string, number>>();
    for (const row of data) {
      const counts = dailyMap.get(row.usage_date) ?? {};
      counts[row.generation_type] = (counts[row.generation_type] ?? 0) + 1;
      dailyMap.set(row.usage_date, counts);
    }

    fillZeroDays(dailyMap, sinceDate, todayDate);

    const entries: AdminUsageDailyEntry[] = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, counts }));

    return { days: entries };
  }

  public async getTotals(days: number): Promise<AdminUsageTotals> {
    const rows = await this.fetchUsageRows(days);
    const totals: AdminUsageTotals = {};
    for (const row of rows) {
      totals[row.generation_type] = (totals[row.generation_type] ?? 0) + 1;
    }
    return totals;
  }

  public async getByType(days: number): Promise<AdminUsageByTypeEntry[]> {
    const totals = await this.getTotals(days);
    return Object.entries(totals).map(([type, count]) => ({ type, count }));
  }

  public async getTopUsers(
    limit: number,
    days: number,
  ): Promise<AdminUsageTopUser[]> {
    const rows = await this.fetchUsageRows(days);
    const countMap = new Map<string, number>();
    for (const row of rows) {
      countMap.set(row.user_id, (countMap.get(row.user_id) ?? 0) + 1);
    }

    const sorted = Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    if (sorted.length === 0) {
      return [];
    }

    const userIds = sorted.map(([id]) => id);
    const supabase = this.supabaseService.getAdminClient();
    const { data: users, error } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .in("id", userIds);

    if (error !== null) {
      this.logger.error(`Failed to load top users: ${error.message}`);
      throw new InternalServerErrorException("Failed to load top users");
    }

    const userMap = new Map(users.map((u) => [u.id, u]));
    return sorted.map(([userId, count]) => ({
      userId,
      name: nameFromUser(userMap.get(userId)),
      count,
    }));
  }

  public async getCostEstimate(days: number): Promise<AdminUsageCostEstimate> {
    const { sinceDate, todayDate } = computeWindow(days);
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from("generation_usage")
      .select("model, prompt_tokens, completion_tokens")
      .gte("usage_date", toDateString(sinceDate))
      .lte("usage_date", toDateString(todayDate));

    if (error !== null) {
      this.logger.error(`Failed to load cost rows: ${error.message}`);
      throw new InternalServerErrorException("Failed to load cost estimate");
    }

    return this.buildCostEstimate(data);
  }

  private async fetchUsageRows(days: number): Promise<UsageRow[]> {
    const { sinceDate, todayDate } = computeWindow(days);
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from("generation_usage")
      .select("user_id, generation_type, usage_date")
      .gte("usage_date", toDateString(sinceDate))
      .lte("usage_date", toDateString(todayDate));

    if (error !== null) {
      this.logger.error(`Failed to load usage rows: ${error.message}`);
      throw new InternalServerErrorException("Failed to load usage");
    }
    return data;
  }

  private buildCostEstimate(rows: CostRow[]): AdminUsageCostEstimate {
    const byModel: Record<string, AdminUsageCostByModel> = {};
    const totalRows = rows.length;
    let rowsWithTokens = 0;
    const unpricedModels = new Set<string>();

    for (const row of rows) {
      if (!hasTokens(row)) {
        continue;
      }
      rowsWithTokens += 1;
      const modelKey = resolveModelKey(row.model, unpricedModels);
      const bucket = byModel[modelKey] ?? emptyBucket();
      bucket.promptTokens += row.prompt_tokens ?? 0;
      bucket.completionTokens += row.completion_tokens ?? 0;
      bucket.costUsd += rowCost(row, modelKey);
      byModel[modelKey] = bucket;
    }

    if (unpricedModels.size > 0) {
      this.logger.warn(
        `Unpriced models in cost estimate: ${Array.from(unpricedModels).join(", ")}`,
      );
    }

    const totalCostUsd = Object.values(byModel).reduce(
      (sum, bucket) => sum + bucket.costUsd,
      0,
    );
    const coverageRatio = totalRows === 0 ? 0 : rowsWithTokens / totalRows;

    return { totalCostUsd, byModel, coverageRatio };
  }
}

function computeWindow(days: number): { sinceDate: Date; todayDate: Date } {
  const todayDate = new Date();
  const sinceDate = new Date(todayDate);
  sinceDate.setUTCDate(sinceDate.getUTCDate() - (days - 1));
  return { sinceDate, todayDate };
}

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

function fillZeroDays(
  map: Map<string, Record<string, number>>,
  sinceDate: Date,
  todayDate: Date,
): void {
  const cursor = new Date(sinceDate);
  while (cursor <= todayDate) {
    const dateStr = toDateString(cursor);
    if (!map.has(dateStr)) {
      map.set(dateStr, {});
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

function nameFromUser(
  user: { first_name: string | null; last_name: string | null } | undefined,
): string {
  if (user === undefined) {
    return UNKNOWN_USER_NAME;
  }
  const joined = [user.first_name, user.last_name]
    .filter((value): value is string => value !== null && value !== "")
    .join(" ");
  return joined === "" ? UNKNOWN_USER_NAME : joined;
}

function hasTokens(row: CostRow): boolean {
  return row.prompt_tokens !== null || row.completion_tokens !== null;
}

function resolveModelKey(
  model: string | null,
  unpricedModels: Set<string>,
): string {
  if (model === null || model === "") {
    unpricedModels.add("(null)");
    return UNPRICED_MODEL_KEY;
  }
  if (config.modelPricing[model] === undefined) {
    unpricedModels.add(model);
    return UNPRICED_MODEL_KEY;
  }
  return model;
}

function rowCost(row: CostRow, modelKey: string): number {
  if (modelKey === UNPRICED_MODEL_KEY) {
    return 0;
  }
  const pricing = config.modelPricing[modelKey];
  if (pricing === undefined) {
    return 0;
  }
  const promptCost =
    ((row.prompt_tokens ?? 0) * pricing.inputPer1M) / TOKENS_PER_MILLION;
  const completionCost =
    ((row.completion_tokens ?? 0) * pricing.outputPer1M) / TOKENS_PER_MILLION;
  return promptCost + completionCost;
}

function emptyBucket(): AdminUsageCostByModel {
  return { promptTokens: 0, completionTokens: 0, costUsd: 0 };
}
