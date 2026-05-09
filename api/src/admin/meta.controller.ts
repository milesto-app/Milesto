import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { User } from "@supabase/supabase-js";
import type { Request } from "express";

import { AdminGuard } from "../common/guards/admin.guard.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import { MetaService } from "./meta.service.js";
import type {
  AdminListResponse,
  AdminMe,
  AdminRoleUpdate,
} from "./meta.types.js";

@ApiTags("Admin")
@ApiBearerAuth()
@Controller("admin")
@UseGuards(AuthGuard, AdminGuard)
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

  @Get("me")
  @ApiOperation({
    summary: "Authenticated admin user",
    description:
      "Returns the current admin user's id, email, role, and name fields.",
  })
  @ApiResponse({ status: 200, description: "User returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admin access required" })
  public async getMe(@Req() request: Request): Promise<AdminMe> {
    return this.metaService.getMe(getRequestUser(request));
  }

  @Get("admins")
  @ApiOperation({
    summary: "List all admin users",
    description: "Returns every user whose app_metadata.role is 'admin'.",
  })
  @ApiResponse({ status: 200, description: "Admins returned" })
  public async listAdmins(): Promise<AdminListResponse> {
    return this.metaService.listAdmins();
  }

  @Post("admins/:userId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Promote a user to admin" })
  @ApiParam({ name: "userId", description: "Auth user UUID" })
  @ApiResponse({ status: 200, description: "User promoted to admin" })
  @ApiResponse({ status: 404, description: "User not found" })
  public async promoteAdmin(
    @Param("userId", ParseUUIDPipe) userId: string,
  ): Promise<AdminRoleUpdate> {
    return this.metaService.promoteAdmin(userId);
  }

  @Delete("admins/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Demote an admin back to a regular user" })
  @ApiParam({ name: "userId", description: "Auth user UUID" })
  @ApiResponse({ status: 204, description: "User demoted" })
  @ApiResponse({ status: 400, description: "Cannot demote yourself" })
  @ApiResponse({ status: 404, description: "User not found" })
  public async demoteAdmin(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Req() request: Request,
  ): Promise<void> {
    await this.metaService.demoteAdmin(userId, getRequestUser(request).id);
  }
}

function getRequestUser(request: Request): User {
  const user = (request as unknown as Record<string, unknown>)["user"];
  if (user === undefined) {
    throw new Error("User not found on request — is AuthGuard applied?");
  }
  return user as User;
}
