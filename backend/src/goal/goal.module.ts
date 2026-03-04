import { Module } from '@nestjs/common';

import { GoalController } from './goal.controller.js';
import { GoalService } from './goal.service.js';

@Module({
  controllers: [GoalController],
  providers: [GoalService],
  exports: [GoalService],
})
export class GoalModule {}
