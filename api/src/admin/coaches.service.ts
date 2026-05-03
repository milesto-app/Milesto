import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import { COACH_BY_ID, COACHES } from "../coach/coaches.config.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import type {
  AdminCoachSummary,
  AdminCoachUserList,
  AdminCoachUserSummary,
} from "./coaches.types.js";

@Injectable()
export class CoachesService {
  private readonly logger = new Logger(CoachesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async listCoaches(): Promise<AdminCoachSummary[]> {
    const counts = await this.fetchCoachUserCounts();
    return COACHES.map((coach) => ({
      id: coach.id,
      personality: coach.personality,
      displayName: coach.displayName,
      description: coach.description,
      icon: coach.icon,
      userCount: counts.get(coach.id) ?? 0,
    }));
  }

  public async listCoachUsers(
    coachId: number,
    page: number,
    perPage: number,
  ): Promise<AdminCoachUserList> {
    if (!COACH_BY_ID.has(coachId)) {
      throw new NotFoundException(`Coach ${coachId} not found`);
    }

    const supabase = this.supabaseService.getAdminClient();
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, count, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, subscription_status, coach_id", {
        count: "exact",
      })
      .eq("coach_id", coachId)
      .order("id", { ascending: true })
      .range(from, to);

    if (error !== null) {
      this.logger.error(
        `Failed to list users for coach ${coachId}: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to list coach users");
    }

    const total = count ?? 0;
    const users = await this.enrichWithAuth(data);

    return {
      users,
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    };
  }

  private async fetchCoachUserCounts(): Promise<Map<number, number>> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("coach_id")
      .not("coach_id", "is", null);

    if (error !== null) {
      this.logger.error(`Failed to load coach user counts: ${error.message}`);
      throw new InternalServerErrorException(
        "Failed to load coach user counts",
      );
    }

    const counts = new Map<number, number>();
    for (const row of data) {
      counts.set(row.coach_id, (counts.get(row.coach_id) ?? 0) + 1);
    }
    return counts;
  }

  private async enrichWithAuth(
    profiles: Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      subscription_status: string;
    }>,
  ): Promise<AdminCoachUserSummary[]> {
    if (profiles.length === 0) {
      return [];
    }

    const supabase = this.supabaseService.getAdminClient();
    const authResults = await Promise.all(
      profiles.map(async (profile) =>
        supabase.auth.admin.getUserById(profile.id),
      ),
    );

    return profiles.map((profile, index) => {
      const authResult = authResults[index];
      const authUser = authResult?.data.user ?? null;
      return {
        id: profile.id,
        email: authUser?.email ?? "",
        firstName: profile.first_name,
        lastName: profile.last_name,
        subscriptionStatus: profile.subscription_status,
        createdAt: authUser?.created_at ?? "",
      };
    });
  }
}
