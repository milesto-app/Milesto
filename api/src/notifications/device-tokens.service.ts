import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";

import { SupabaseService } from "../supabase/supabase.service.js";

export type DeviceToken = {
  token: string;
  environment: string;
};

@Injectable()
export class DeviceTokensService {
  private readonly logger = new Logger(DeviceTokensService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async upsert(
    userId: string,
    token: string,
    environment: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    const { error } = await supabase.from("device_tokens").upsert(
      {
        user_id: userId,
        token,
        environment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );

    if (error !== null) {
      this.logger.error("Failed to upsert device token", error.message);
      throw new InternalServerErrorException("Failed to register device token");
    }
  }

  public async delete(userId: string, token: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    const { error } = await supabase
      .from("device_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("token", token);

    if (error !== null) {
      this.logger.error("Failed to delete device token", error.message);
      throw new InternalServerErrorException(
        "Failed to unregister device token",
      );
    }
  }

  public async deleteByToken(token: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    const { error } = await supabase
      .from("device_tokens")
      .delete()
      .eq("token", token);

    if (error !== null) {
      this.logger.error("Failed to delete stale device token", error.message);
    }
  }

  public async findByUser(userId: string): Promise<DeviceToken[]> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from("device_tokens")
      .select("token, environment")
      .eq("user_id", userId);

    if (error !== null) {
      this.logger.error(
        "Failed to fetch device tokens for user",
        error.message,
      );
      throw new InternalServerErrorException("Failed to fetch device tokens");
    }

    return data;
  }

  public async findAllUserIds(): Promise<string[]> {
    const supabase = this.supabaseService.getAdminClient();
    const PAGE_SIZE = 1_000;
    const unique = new Set<string>();
    let offset = 0;

    for (;;) {
      const { data, error } = await supabase
        .from("device_tokens")
        .select("user_id")
        .range(offset, offset + PAGE_SIZE - 1);

      if (error !== null) {
        this.logger.error("Failed to fetch all user IDs", error.message);
        break;
      }

      for (const row of data) {
        unique.add(row.user_id);
      }

      if (data.length < PAGE_SIZE) {
        break;
      }

      offset += PAGE_SIZE;
    }

    return [...unique];
  }
}
