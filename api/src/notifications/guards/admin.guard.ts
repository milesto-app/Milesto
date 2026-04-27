import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";

type RequestUser = {
  id: string;
  app_metadata?: { role?: string };
};

@Injectable()
export class AdminGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as unknown as Record<string, unknown>)["user"] as
      | RequestUser
      | undefined;

    if (user?.app_metadata?.role !== "admin") {
      throw new ForbiddenException("Admin access required");
    }

    return true;
  }
}
