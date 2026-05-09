import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { UserId } from "../common/decorators/user.decorator.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import { UpdateUserDto } from "./dto/update-user.dto.js";
import type { UserResponse } from "./user.service.js";
import { UserService } from "./user.service.js";

@ApiTags("user")
@ApiBearerAuth()
@Controller("me")
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: "Get the authenticated user" })
  @ApiResponse({ status: HttpStatus.OK, description: "User returned" })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "User not found",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  public async getMe(@UserId() userId: string): Promise<UserResponse> {
    return this.userService.findOne(userId);
  }

  @Patch()
  @ApiOperation({ summary: "Update the authenticated user" })
  @ApiResponse({ status: HttpStatus.OK, description: "User updated" })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "User not found",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  public async updateMe(
    @UserId() userId: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponse> {
    return this.userService.update(userId, dto);
  }
}
