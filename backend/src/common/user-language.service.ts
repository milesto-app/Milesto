import { Injectable, Logger } from "@nestjs/common";

import { SupabaseService } from "../supabase/supabase.service.js";

const DEFAULT_LANGUAGE = "en";

@Injectable()
export class UserLanguageService {
  private readonly logger = new Logger(UserLanguageService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async getLanguage(userId: string): Promise<string> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", userId)
      .single();

    if (error !== null) {
      this.logger.warn(
        `No profile for user ${userId}, defaulting to '${DEFAULT_LANGUAGE}'`,
      );
      return DEFAULT_LANGUAGE;
    }

    return data.language ?? DEFAULT_LANGUAGE;
  }
}
