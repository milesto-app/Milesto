import { Controller, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AdminGuard } from "../common/guards/admin.guard.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import { IntakeReembedService } from "./intake-reembed.service.js";
import type { ReembedResult } from "./types/intake.types.js";

@ApiTags("Admin")
@ApiBearerAuth()
@Controller("admin")
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly reembedService: IntakeReembedService) {}

  @Post("reembed-missing")
  @ApiOperation({
    summary: "Retry embedding for all entries that failed to embed",
  })
  @ApiResponse({ status: 201, description: "Re-embedding results returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  public async reembedMissing(): Promise<ReembedResult> {
    return this.reembedService.reembedMissing();
  }
}
