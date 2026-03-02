import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

// eslint-disable-next-line @typescript-eslint/naming-convention -- NestJS decorator convention uses PascalCase
export const UserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const user = (request as unknown as Record<string, unknown>)['user'] as
    | { id: string }
    | undefined;
  if (user === undefined) {
    throw new Error('User not found on request — is AuthGuard applied?');
  }
  return user.id;
});
