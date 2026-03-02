import { Module } from '@nestjs/common';
import { CoachController } from './coach.controller.js';
import { CoachService } from './coach.service.js';

@Module({
  controllers: [CoachController],
  providers: [CoachService],
  exports: [CoachService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CoachModule {}
