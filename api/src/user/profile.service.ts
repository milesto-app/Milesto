import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import type { Database } from "../supabase/database.types.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import type { UpdateProfileDto } from "./dto/update-profile.dto.js";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export interface ProfileResponse {
  id: string;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  coach_id: number | null;
  language: string | null;
  created_at: string | null;
}

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async findOne(userId: string): Promise<ProfileResponse> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, date_of_birth, coach_id, language, created_at",
      )
      .eq("id", userId)
      .maybeSingle();

    if (error !== null) {
      this.logger.error(`Failed to fetch profile ${userId}: ${error.message}`);
      throw new InternalServerErrorException("Failed to fetch profile");
    }
    if (data === null) {
      throw new NotFoundException("Profile not found");
    }

    return this.toResponse(data as ProfileRow);
  }

  public async update(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    const supabase = this.supabaseService.getAdminClient();
    const update: ProfileUpdate = {
      ...(dto.first_name !== undefined ? { first_name: dto.first_name } : {}),
      ...(dto.last_name !== undefined ? { last_name: dto.last_name } : {}),
      ...(dto.date_of_birth !== undefined
        ? { date_of_birth: dto.date_of_birth }
        : {}),
      ...(dto.coach_id !== undefined ? { coach_id: dto.coach_id } : {}),
      ...(dto.language !== undefined ? { language: dto.language } : {}),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", userId)
      .select(
        "id, first_name, last_name, date_of_birth, coach_id, language, created_at",
      )
      .maybeSingle();

    if (error !== null) {
      this.logger.error(`Failed to update profile ${userId}: ${error.message}`);
      throw new InternalServerErrorException("Failed to update profile");
    }
    if (data === null) {
      throw new NotFoundException("Profile not found");
    }

    return this.toResponse(data as ProfileRow);
  }

  private toResponse(row: ProfileRow): ProfileResponse {
    return {
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      date_of_birth: row.date_of_birth,
      coach_id: row.coach_id,
      language: row.language,
      created_at: row.created_at,
    };
  }
}
