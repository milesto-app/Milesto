import { Module } from "@nestjs/common";

import { CoachController } from "./coach.controller.js";

@Module({
  controllers: [CoachController],
})
export class CoachModule {}
