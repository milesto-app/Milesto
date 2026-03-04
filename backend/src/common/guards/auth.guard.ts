import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { SupabaseService } from '../../supabase/supabase.service.js';

const BEARER_PREFIX_LENGTH = 7;

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (authHeader === undefined || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid authorization header',
      );
    }

    const token = authHeader.slice(BEARER_PREFIX_LENGTH);
    const client = this.supabaseService.getClientForUser(token);

    const {
      data: { user },
      error,
    } = await client.auth.getUser();

    if (error !== null || user === null) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    (request as unknown as Record<string, unknown>)['user'] = user;
    return true;
  }
}
