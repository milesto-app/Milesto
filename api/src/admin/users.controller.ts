import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { UserId } from "../common/decorators/user.decorator.js";
import { AdminGuard } from "../common/guards/admin.guard.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import { GrantProDto } from "./dto/grant-pro.dto.js";
import { ListUsersQueryDto } from "./dto/list-users-query.dto.js";
import { PatchUserDto } from "./dto/patch-user.dto.js";
import { UsersService } from "./users.service.js";
import type {
  AdminUserDetail,
  AdminUserDevice,
  AdminUserGoal,
  AdminUserList,
  AdminUserSubscription,
  AdminUserUsage,
} from "./users.types.js";

@ApiTags("Admin")
@ApiBearerAuth()
@Controller("admin/users")
@UseGuards(AuthGuard, AdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: "List users",
    description:
      "Paginated list of users with optional email search and subscription-status filter.",
  })
  @ApiResponse({ status: 200, description: "Users returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admin access required" })
  public async listUsers(
    @Query() query: ListUsersQueryDto,
  ): Promise<AdminUserList> {
    return this.usersService.listUsers(
      query.page,
      query.perPage,
      query.search,
      query.status,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "User profile + goal count" })
  @ApiParam({ name: "id", description: "Auth user UUID" })
  @ApiResponse({ status: 200, description: "User detail returned" })
  @ApiResponse({ status: 404, description: "User not found" })
  public async getUser(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AdminUserDetail> {
    return this.usersService.getUserDetail(id);
  }

  @Get(":id/goals")
  @ApiOperation({ summary: "Goals for a user with milestone/task counts" })
  @ApiParam({ name: "id", description: "Auth user UUID" })
  @ApiResponse({ status: 200, description: "Goals returned" })
  public async getUserGoals(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AdminUserGoal[]> {
    return this.usersService.getUserGoals(id);
  }

  @Get(":id/usage")
  @ApiOperation({ summary: "Generation usage history for a user" })
  @ApiParam({ name: "id", description: "Auth user UUID" })
  @ApiResponse({ status: 200, description: "Usage returned" })
  public async getUserUsage(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AdminUserUsage> {
    return this.usersService.getUserUsage(id);
  }

  @Get(":id/subscription")
  @ApiOperation({ summary: "Full subscription state for a user" })
  @ApiParam({ name: "id", description: "Auth user UUID" })
  @ApiResponse({ status: 200, description: "Subscription returned" })
  @ApiResponse({ status: 404, description: "Profile not found" })
  public async getUserSubscription(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AdminUserSubscription> {
    return this.usersService.getUserSubscription(id);
  }

  @Get(":id/devices")
  @ApiOperation({ summary: "Registered device tokens for a user" })
  @ApiParam({ name: "id", description: "Auth user UUID" })
  @ApiResponse({ status: 200, description: "Devices returned" })
  public async getUserDevices(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AdminUserDevice[]> {
    return this.usersService.getUserDevices(id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Update role, language, or coach for a user",
  })
  @ApiParam({ name: "id", description: "Auth user UUID" })
  @ApiResponse({ status: 200, description: "User updated" })
  @ApiResponse({ status: 404, description: "User not found" })
  public async patchUser(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: PatchUserDto,
  ): Promise<AdminUserDetail> {
    return this.usersService.patchUser(id, body);
  }

  @Post(":id/grant-pro")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Manually grant a pro subscription with an explicit expiry",
  })
  @ApiParam({ name: "id", description: "Auth user UUID" })
  @ApiResponse({ status: 200, description: "Pro granted" })
  public async grantPro(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: GrantProDto,
    @UserId() adminUserId: string,
  ): Promise<AdminUserSubscription> {
    return this.usersService.grantPro(id, body.expiresAt, adminUserId);
  }

  @Post(":id/revoke-pro")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Revoke a manual pro override" })
  @ApiParam({ name: "id", description: "Auth user UUID" })
  @ApiResponse({ status: 200, description: "Pro revoked" })
  public async revokePro(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AdminUserSubscription> {
    return this.usersService.revokePro(id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Soft-delete a user (GDPR removal)",
  })
  @ApiParam({ name: "id", description: "Auth user UUID" })
  @ApiResponse({ status: 204, description: "User deleted" })
  @ApiResponse({ status: 404, description: "User not found" })
  public async deleteUser(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.usersService.deleteUser(id);
  }
}
