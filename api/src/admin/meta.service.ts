import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { User } from "@supabase/supabase-js";

import { SupabaseService } from "../supabase/supabase.service.js";
import type {
  AdminListEntry,
  AdminListResponse,
  AdminMe,
  AdminRoleUpdate,
} from "./meta.types.js";

const ADMIN_ROLE = "admin";
const USER_ROLE = "user";
const ADMIN_LIST_PAGE_SIZE = 1000;

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async getMe(user: User): Promise<AdminMe> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();

    if (error !== null) {
      this.logger.error(`Failed to load user ${user.id}: ${error.message}`);
      throw new InternalServerErrorException("Failed to load user");
    }

    return {
      id: user.id,
      email: user.email ?? "",
      role: roleFromUser(user),
      firstName: data?.first_name ?? null,
      lastName: data?.last_name ?? null,
    };
  }

  public async listAdmins(): Promise<AdminListResponse> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: ADMIN_LIST_PAGE_SIZE,
    });

    if (error !== null) {
      this.logger.error(`Failed to list users: ${error.message}`);
      throw new InternalServerErrorException("Failed to list admins");
    }

    const admins = data.users.filter((u) => roleFromUser(u) === ADMIN_ROLE);
    if (admins.length === 0) {
      return { admins: [] };
    }

    const ids = admins.map((u) => u.id);
    const { data: userRows, error: userRowsError } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .in("id", ids);

    if (userRowsError !== null) {
      this.logger.error(`Failed to load admin users: ${userRowsError.message}`);
      throw new InternalServerErrorException("Failed to load admin users");
    }

    const userMap = new Map(userRows.map((u) => [u.id, u] as const));

    const entries: AdminListEntry[] = admins.map((u) => {
      const row = userMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        firstName: row?.first_name ?? null,
        lastName: row?.last_name ?? null,
        createdAt: u.created_at,
      };
    });

    return { admins: entries };
  }

  public async promoteAdmin(userId: string): Promise<AdminRoleUpdate> {
    return this.setRole(userId, ADMIN_ROLE);
  }

  public async demoteAdmin(userId: string, requesterId: string): Promise<void> {
    if (userId === requesterId) {
      throw new BadRequestException("Cannot demote yourself");
    }
    await this.setRole(userId, USER_ROLE);
  }

  private async setRole(
    userId: string,
    role: string,
  ): Promise<AdminRoleUpdate> {
    const supabase = this.supabaseService.getAdminClient();
    const existing = await supabase.auth.admin.getUserById(userId);
    if (existing.error !== null) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const currentMetadata = existing.data.user.app_metadata as Record<
      string,
      unknown
    >;
    const nextMetadata = { ...currentMetadata, role };

    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: nextMetadata,
    });

    if (error !== null) {
      this.logger.error(
        `Failed to update role for ${userId}: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to update role");
    }

    return {
      id: data.user.id,
      email: data.user.email ?? "",
      role,
    };
  }
}

function roleFromUser(user: User): string {
  const metadata = user.app_metadata as { role?: unknown } | null | undefined;
  const role = metadata?.role;
  return typeof role === "string" ? role : USER_ROLE;
}
