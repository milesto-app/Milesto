import { timingSafeEqual } from 'node:crypto';

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class ElevenLabsWebhookAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const signature = request.headers['x-elevenlabs-signature'] as
      | string
      | undefined;

    if (signature === undefined) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    const webhookSecret = this.configService.getOrThrow<string>(
      'ELEVENLABS_WEBHOOK_SECRET',
    );

    const expected = Buffer.from(webhookSecret, 'utf8');
    const provided = Buffer.from(signature, 'utf8');

    if (
      expected.length !== provided.length ||
      !timingSafeEqual(expected, provided)
    ) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
