import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AiModule } from './ai/ai.module.js';
import { ChatModule } from './chat/chat.module.js';
import { CoachModule } from './coach/coach.module.js';
import { CommonModule } from './common/common.module.js';
import { appConfig } from './config/app.config.js';
import { ConfigModule } from './config/config.module.js';
import { GoalModule } from './goal/goal.module.js';
import { IntakeModule } from './intake/intake.module.js';
import { RoadmapModule } from './roadmap/roadmap.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';
import { VoiceModule } from './voice/voice.module.js';
import { VoiceChatModule } from './voice-chat/voice-chat.module.js';

@Module({
  imports: [
    CommonModule,
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
    VoiceChatModule,
    ChatModule,
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
      this.logger.error(
        `Unhandled event listener error: ${error.message}`,
        error.stack,
      );
    });
  }
}
