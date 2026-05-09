import { Module } from "@nestjs/common";

import { UsageService } from "./usage.service.js";

@Module({
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
