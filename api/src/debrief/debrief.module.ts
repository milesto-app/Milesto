import { Module } from "@nestjs/common";

import { DebriefController } from "./debrief.controller.js";
import { DebriefService } from "./debrief.service.js";

@Module({
  controllers: [DebriefController],
  providers: [DebriefService],
  exports: [DebriefService],
})
export class DebriefModule {}
