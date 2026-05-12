import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AdminGuard } from "../common/guards/admin.guard.js";
import { AuthGuard } from "../common/guards/auth.guard.js";
import { SystemService } from "./system.service.js";
import type {
  AdminHealthReport,
  AdminLlmHealthReport,
} from "./system.types.js";

@ApiTags("Admin")
@ApiBearerAuth()
@Controller("admin")
@UseGuards(AuthGuard, AdminGuard)
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get("health")
  @ApiOperation({
    summary: "Backend, Supabase, and notification queue health",
    description:
      "Reports backend reachability, Supabase round-trip latency, and the size of the most recent notification dispatch batch.",
  })
  @ApiResponse({ status: 200, description: "Health report returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admin access required" })
  public async getHealth(): Promise<AdminHealthReport> {
    return this.systemService.getHealth();
  }

  @Get("health/llm")
  @ApiOperation({
    summary: "OpenRouter and Cohere reachability",
    description:
      "Issues a tiny probe call against each LLM provider in parallel. Partial failures are reflected in the response rather than thrown.",
  })
  @ApiResponse({ status: 200, description: "LLM health report returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admin access required" })
  public async getLlmHealth(): Promise<AdminLlmHealthReport> {
    return this.systemService.getLlmHealth();
  }
}
