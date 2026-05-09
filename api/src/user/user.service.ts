import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import type { Database } from "../supabase/database.types.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import type { UpdateUserDto } from "./dto/update-user.dto.js";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

export interface UserResponse {
  id: string;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  coach_id: number | null;
  language: string | null;
  created_at: string | null;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async findOne(userId: string): Promise<UserResponse> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select(
        "id, first_name, last_name, date_of_birth, coach_id, language, created_at",
      )
      .eq("id", userId)
      .maybeSingle();

    if (error !== null) {
      this.logger.error(`Failed to fetch user ${userId}: ${error.message}`);
      throw new InternalServerErrorException("Failed to fetch user");
    }
    if (data === null) {
      throw new NotFoundException("User not found");
    }

    return this.toResponse(data as UserRow);
  }

  public async update(
    userId: string,
    dto: UpdateUserDto,
  ): Promise<UserResponse> {
    const supabase = this.supabaseService.getAdminClient();
    const update: UserUpdate = {
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
      .from("users")
      .update(update)
      .eq("id", userId)
      .select(
        "id, first_name, last_name, date_of_birth, coach_id, language, created_at",
      )
      .maybeSingle();

    if (error !== null) {
      this.logger.error(`Failed to update user ${userId}: ${error.message}`);
      throw new InternalServerErrorException("Failed to update user");
    }
    if (data === null) {
      throw new NotFoundException("User not found");
    }

    return this.toResponse(data as UserRow);
  }

  private toResponse(row: UserRow): UserResponse {
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
