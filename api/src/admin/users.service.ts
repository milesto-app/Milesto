import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { User as AuthUser } from "@supabase/supabase-js";

import { SubscriptionService } from "../subscription/subscription.service.js";
import { SUBSCRIPTION_STATUS } from "../subscription/subscription-state.js";
import type { TablesUpdate } from "../supabase/database.types.js";
import { SUPABASE_NOT_FOUND } from "../supabase/error-codes.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import type { AdminUserRole } from "./dto/patch-user.dto.js";
import type {
  AdminUserDetail,
  AdminUserDevice,
  AdminUserGoal,
  AdminUserList,
  AdminUserSubscription,
  AdminUserSummary,
  AdminUserUsage,
  AdminUserUsageEntry,
} from "./users.types.js";

const DEFAULT_USER_ROLE = "user";
const SEARCH_USER_POOL_SIZE = 1000;
const RECENT_USAGE_LIMIT = 50;
const TOKEN_LAST_CHARS = 4;
const HTTP_NOT_FOUND = 404;

interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  language: string | null;
  timezone: string | null;
  birth_year: number | null;
  coach_id: number | null;
  subscription_status: string;
  subscription_expires_at: string | null;
  subscription_product_id: string | null;
  subscription_environment: string | null;
  subscription_auto_renew_status: boolean | null;
  subscription_original_transaction_id: string | null;
  subscription_apple_signed_at: string | null;
  subscription_verified_at: string | null;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  public async listUsers(
    page: number,
    perPage: number,
    search: string | undefined,
    status: string | undefined,
  ): Promise<AdminUserList> {
    if (search !== undefined && search !== "") {
      return this.listUsersBySearch(page, perPage, search, status);
    }
    return this.listUsersByPage(page, perPage, status);
  }

  public async getUserDetail(userId: string): Promise<AdminUserDetail> {
    const authUser = await this.requireAuthUser(userId);
    const [user, goalCount] = await Promise.all([
      this.fetchUser(userId),
      this.fetchGoalCount(userId),
    ]);
    return buildUserDetail(authUser, user, goalCount);
  }

  public async getUserGoals(userId: string): Promise<AdminUserGoal[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: goals, error } = await supabase
      .from("goals")
      .select("id, title, status, target_date, created_at")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error !== null) {
      this.logger.error(`Failed to load goals for ${userId}: ${error.message}`);
      throw new InternalServerErrorException("Failed to load goals");
    }
    if (goals.length === 0) {
      return [];
    }

    const goalIds = goals.map((goal) => goal.id);
    const [milestoneCounts, taskCounts] = await Promise.all([
      this.fetchMilestoneCounts(goalIds),
      this.fetchTaskCounts(goalIds),
    ]);

    return goals.map((goal) => {
      const tasks = taskCounts.get(goal.id) ?? { total: 0, completed: 0 };
      return {
        id: goal.id,
        title: goal.title,
        status: goal.status,
        targetDate: goal.target_date,
        createdAt: goal.created_at,
        milestoneCount: milestoneCounts.get(goal.id) ?? 0,
        totalTasks: tasks.total,
        completedTasks: tasks.completed,
      };
    });
  }

  public async getUserUsage(userId: string): Promise<AdminUserUsage> {
    const supabase = this.supabaseService.getAdminClient();

    const [totalRes, typesRes, recentRes] = await Promise.all([
      supabase
        .from("generation_usage")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("generation_usage")
        .select("generation_type")
        .eq("user_id", userId),
      supabase
        .from("generation_usage")
        .select("id, generation_type, usage_date, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(RECENT_USAGE_LIMIT),
    ]);

    if (recentRes.error !== null) {
      this.logger.error(
        `Failed to load usage for ${userId}: ${recentRes.error.message}`,
      );
      throw new InternalServerErrorException("Failed to load usage");
    }

    if (typesRes.error !== null) {
      this.logger.error(
        `Failed to load usage types for ${userId}: ${typesRes.error.message}`,
      );
      throw new InternalServerErrorException("Failed to load usage");
    }

    const recent: AdminUserUsageEntry[] = recentRes.data.map((entry) => ({
      id: entry.id,
      generationType: entry.generation_type,
      usageDate: entry.usage_date,
      createdAt: entry.created_at,
    }));

    const byType: Record<string, number> = {};
    for (const row of typesRes.data) {
      byType[row.generation_type] = (byType[row.generation_type] ?? 0) + 1;
    }

    return {
      totalGenerations: totalRes.count ?? 0,
      byType,
      recent,
    };
  }

  public async getUserSubscription(
    userId: string,
  ): Promise<AdminUserSubscription> {
    const user = await this.fetchUser(userId);
    if (user === null) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const effective = await this.subscriptionService.getStatus(userId);
    return {
      status: user.subscription_status,
      expiresAt: user.subscription_expires_at,
      productId: user.subscription_product_id,
      environment: user.subscription_environment,
      autoRenewStatus: user.subscription_auto_renew_status,
      originalTransactionId: user.subscription_original_transaction_id,
      appleSignedAt: user.subscription_apple_signed_at,
      verifiedAt: user.subscription_verified_at,
      source: effective.source,
      lastSyncedAt: effective.lastSyncedAt,
    };
  }

  public async getUserDevices(userId: string): Promise<AdminUserDevice[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("device_tokens")
      .select("id, platform, environment, token, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error !== null) {
      this.logger.error(
        `Failed to load devices for ${userId}: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to load devices");
    }

    return data.map((row) => ({
      id: row.id,
      platform: row.platform,
      environment: row.environment,
      tokenLast4: row.token.slice(-TOKEN_LAST_CHARS),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  public async patchUser(
    userId: string,
    patch: { role?: AdminUserRole; language?: string; coachId?: number },
  ): Promise<AdminUserDetail> {
    const supabase = this.supabaseService.getAdminClient();
    const userUpdate = userUpdateFromPatch(patch);

    if (Object.keys(userUpdate).length > 0) {
      const { error } = await supabase
        .from("users")
        .update(userUpdate)
        .eq("id", userId);
      if (error !== null) {
        this.logger.error(`Failed to update user ${userId}: ${error.message}`);
        throw new InternalServerErrorException("Failed to update user");
      }
    }

    if (patch.role !== undefined) {
      await this.updateUserRole(userId, patch.role);
    }

    return this.getUserDetail(userId);
  }

  public async grantPro(
    userId: string,
    expiresAt: string,
    createdBy: string,
  ): Promise<AdminUserSubscription> {
    await this.subscriptionService.grantOverride(userId, expiresAt, createdBy);
    return this.getUserSubscription(userId);
  }

  public async revokePro(userId: string): Promise<AdminUserSubscription> {
    await this.subscriptionService.revokeOverride(userId);
    return this.getUserSubscription(userId);
  }

  public async deleteUser(userId: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase.auth.admin.deleteUser(userId, true);

    if (error !== null) {
      if (error.status === HTTP_NOT_FOUND) {
        throw new NotFoundException(`User ${userId} not found`);
      }
      this.logger.error(`Failed to delete user ${userId}: ${error.message}`);
      throw new InternalServerErrorException("Failed to delete user");
    }
  }

  private async listUsersByPage(
    page: number,
    perPage: number,
    status: string | undefined,
  ): Promise<AdminUserList> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error !== null) {
      this.logger.error(`Failed to list users: ${error.message}`);
      throw new InternalServerErrorException("Failed to list users");
    }

    const total = extractTotalUsers(data);
    const users = await this.enrichWithUsers(data.users);
    const filtered = applyStatusFilter(users, status);

    return {
      users: filtered,
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    };
  }

  private async listUsersBySearch(
    page: number,
    perPage: number,
    search: string,
    status: string | undefined,
  ): Promise<AdminUserList> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: SEARCH_USER_POOL_SIZE,
    });

    if (error !== null) {
      this.logger.error(`Failed to search users: ${error.message}`);
      throw new InternalServerErrorException("Failed to search users");
    }

    const lowered = search.toLowerCase();
    const matched = data.users.filter((authUser) =>
      (authUser.email ?? "").toLowerCase().includes(lowered),
    );

    const enriched = await this.enrichWithUsers(matched);
    const filtered = applyStatusFilter(enriched, status);
    const total = filtered.length;
    const start = (page - 1) * perPage;
    const slice = filtered.slice(start, start + perPage);

    return {
      users: slice,
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    };
  }

  private async enrichWithUsers(
    authUsers: AuthUser[],
  ): Promise<AdminUserSummary[]> {
    if (authUsers.length === 0) {
      return [];
    }

    const supabase = this.supabaseService.getAdminClient();
    const userIds = authUsers.map((authUser) => authUser.id);
    const { data: users } = await supabase
      .from("users")
      .select("id, first_name, last_name, subscription_status, coach_id")
      .in("id", userIds);

    const userMap = new Map(users?.map((u) => [u.id, u]) ?? []);

    return authUsers.map((authUser) => {
      const user = userMap.get(authUser.id);
      return {
        id: authUser.id,
        email: authUser.email ?? "",
        firstName: user?.first_name ?? null,
        lastName: user?.last_name ?? null,
        subscriptionStatus:
          user?.subscription_status ?? SUBSCRIPTION_STATUS.UNKNOWN,
        coachId: user?.coach_id ?? null,
        createdAt: authUser.created_at,
      };
    });
  }

  private async fetchUser(userId: string): Promise<UserRow | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select(
        "id, first_name, last_name, language, timezone, birth_year, coach_id, subscription_status, subscription_expires_at, subscription_product_id, subscription_environment, subscription_auto_renew_status, subscription_original_transaction_id, subscription_apple_signed_at, subscription_verified_at",
      )
      .eq("id", userId)
      .maybeSingle();

    if (error !== null && error.code !== SUPABASE_NOT_FOUND) {
      this.logger.error(`Failed to load user ${userId}: ${error.message}`);
      throw new InternalServerErrorException("Failed to load user");
    }

    return data;
  }

  private async fetchGoalCount(userId: string): Promise<number> {
    const supabase = this.supabaseService.getAdminClient();
    const { count, error } = await supabase
      .from("goals")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error !== null) {
      this.logger.error(
        `Failed to count goals for ${userId}: ${error.message}`,
      );
      return 0;
    }
    return count ?? 0;
  }

  private async fetchMilestoneCounts(
    goalIds: string[],
  ): Promise<Map<string, number>> {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from("milestones")
      .select("goal_id")
      .in("goal_id", goalIds);

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      counts.set(row.goal_id, (counts.get(row.goal_id) ?? 0) + 1);
    }
    return counts;
  }

  private async fetchTaskCounts(
    goalIds: string[],
  ): Promise<Map<string, { total: number; completed: number }>> {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from("tasks")
      .select("goal_id, completed_at")
      .in("goal_id", goalIds);

    const counts = new Map<string, { total: number; completed: number }>();
    for (const row of data ?? []) {
      const entry = counts.get(row.goal_id) ?? { total: 0, completed: 0 };
      entry.total += 1;
      if (row.completed_at !== null) {
        entry.completed += 1;
      }
      counts.set(row.goal_id, entry);
    }
    return counts;
  }

  private async requireAuthUser(userId: string): Promise<AuthUser> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error !== null) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    return data.user;
  }

  private async updateUserRole(
    userId: string,
    role: AdminUserRole,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: { role },
    });

    if (error !== null) {
      this.logger.error(
        `Failed to update role for ${userId}: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to update role");
    }
  }
}

function roleFromAuthUser(authUser: AuthUser): string {
  const metadata = authUser.app_metadata as { role?: unknown };
  const role = metadata.role;
  return typeof role === "string" ? role : DEFAULT_USER_ROLE;
}

function buildUserDetail(
  authUser: AuthUser,
  user: UserRow | null,
  goalCount: number,
): AdminUserDetail {
  const fields = userDetailFields(user);
  return {
    id: authUser.id,
    email: authUser.email ?? "",
    role: roleFromAuthUser(authUser),
    createdAt: authUser.created_at,
    goalCount,
    ...fields,
  };
}

function userDetailFields(
  user: UserRow | null,
): Pick<
  AdminUserDetail,
  | "firstName"
  | "lastName"
  | "language"
  | "timezone"
  | "birthYear"
  | "coachId"
  | "subscriptionStatus"
  | "subscriptionExpiresAt"
> {
  if (user === null) {
    return {
      firstName: null,
      lastName: null,
      language: null,
      timezone: null,
      birthYear: null,
      coachId: null,
      subscriptionStatus: SUBSCRIPTION_STATUS.UNKNOWN,
      subscriptionExpiresAt: null,
    };
  }
  return {
    firstName: user.first_name,
    lastName: user.last_name,
    language: user.language,
    timezone: user.timezone,
    birthYear: user.birth_year,
    coachId: user.coach_id,
    subscriptionStatus: user.subscription_status,
    subscriptionExpiresAt: user.subscription_expires_at,
  };
}

function extractTotalUsers(data: unknown): number {
  if (data === null || typeof data !== "object") {
    return 0;
  }
  const total = (data as { total?: unknown }).total;
  return typeof total === "number" ? total : 0;
}

function applyStatusFilter(
  users: AdminUserSummary[],
  status: string | undefined,
): AdminUserSummary[] {
  if (status === undefined || status === "") {
    return users;
  }
  return users.filter((user) => user.subscriptionStatus === status);
}

function userUpdateFromPatch(patch: {
  language?: string;
  coachId?: number;
}): TablesUpdate<"users"> {
  const update: TablesUpdate<"users"> = {};
  if (patch.language !== undefined) {
    update.language = patch.language;
  }
  if (patch.coachId !== undefined) {
    update.coach_id = patch.coachId;
  }
  return update;
}
