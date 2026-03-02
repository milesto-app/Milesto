import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { appConfig } from './config/app.config.js';
import { ConfigModule } from './config/config.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';
import { AiModule } from './ai/ai.module.js';
import { GoalModule } from './goal/goal.module.js';
import { IntakeModule } from './intake/intake.module.js';
import { CoachModule } from './coach/coach.module.js';
import { RoadmapModule } from './roadmap/roadmap.module.js';
import { VoiceModule } from './voice/voice.module.js';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: appConfig.throttle.globalTtlMs,
        limit: appConfig.throttle.globalLimit,
      },
    ]),
    SupabaseModule,
    AiModule,
    GoalModule,
    IntakeModule,
    RoadmapModule,
    CoachModule,
    VoiceModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  public onModuleInit(): void {
    this.eventEmitter.on('error', (error: Error) => {
      this.logger.error(`Unhandled event listener error: ${error.message}`, error.stack);
    });
  }
}
