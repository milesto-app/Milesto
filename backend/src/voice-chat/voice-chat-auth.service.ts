import { Injectable, Logger } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service.js';

export interface AuthenticatedUser {
  readonly id: string;
}

@Injectable()
export class VoiceChatAuthService {
  private readonly logger = new Logger(VoiceChatAuthService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async authenticateToken(token: string): Promise<AuthenticatedUser | null> {
    const client = this.supabaseService.getClientForUser(token);

    const {
      data: { user },
      error,
    } = await client.auth.getUser();

    if (error !== null || user === null) {
      this.logger.warn('WebSocket auth failed: invalid or expired token');
      return null;
    }

    return { id: user.id };
  }

  public extractTokenFromUrl(url: string | undefined): string | null {
    if (url === undefined) {
      return null;
    }

    try {
      const searchParams = new URL(url, 'http://localhost').searchParams;
      return searchParams.get('token');
    } catch {
      return null;
    }
  }
}
