import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { VoiceChatSessionStore } from '../voice-chat-session.store.js';

@Injectable()
export class ElevenLabsToolAuthGuard implements CanActivate {
  constructor(private readonly sessionStore: VoiceChatSessionStore) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const sessionId = request.params['sessionId'] as string | undefined;
    const secretHeader = request.headers['x-session-secret'];
    const secret = Array.isArray(secretHeader) ? secretHeader[0] : secretHeader;

    if (!sessionId || !secret) {
      throw new UnauthorizedException('Missing session credentials');
    }

    const session = await this.sessionStore.validateSecret(sessionId, secret);

    if (!session) {
      throw new UnauthorizedException('Invalid session credentials');
    }

    (request as unknown as Record<string, unknown>)['voiceSession'] = session;
    return true;
  }
}
