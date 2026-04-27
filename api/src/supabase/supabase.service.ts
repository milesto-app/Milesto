import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types.js";

@Injectable()
export class SupabaseService {
  private readonly adminClient: SupabaseClient<Database>;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.getOrThrow<string>("SUPABASE_URL");
    const serviceRoleKey = this.configService.getOrThrow<string>(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    this.adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  public getAdminClient(): SupabaseClient<Database> {
    return this.adminClient;
  }

  public getClientForUser(token: string): SupabaseClient<Database> {
    const supabaseUrl = this.configService.getOrThrow<string>("SUPABASE_URL");
    const serviceRoleKey = this.configService.getOrThrow<string>(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    return createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }
}
