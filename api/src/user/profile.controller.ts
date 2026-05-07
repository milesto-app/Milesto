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
import { UpdateProfileDto } from "./dto/update-profile.dto.js";
import type { ProfileResponse } from "./profile.service.js";
import { ProfileService } from "./profile.service.js";

@ApiTags("profile")
@ApiBearerAuth()
@Controller("me/profile")
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: "Get the authenticated user's profile" })
  @ApiResponse({ status: HttpStatus.OK, description: "Profile returned" })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Profile not found",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  public async getMe(@UserId() userId: string): Promise<ProfileResponse> {
    return this.profileService.findOne(userId);
  }

  @Patch()
  @ApiOperation({ summary: "Update the authenticated user's profile" })
  @ApiResponse({ status: HttpStatus.OK, description: "Profile updated" })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Profile not found",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  public async updateMe(
    @UserId() userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    return this.profileService.update(userId, dto);
  }
}
