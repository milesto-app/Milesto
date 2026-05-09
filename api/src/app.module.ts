import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { AdminModule } from "./admin/admin.module.js";
import { AiModule } from "./ai/ai.module.js";
import { ChatModule } from "./chat/chat.module.js";
import { CoachModule } from "./coach/coach.module.js";
import { CommonModule } from "./common/common.module.js";
import { config } from "./config/app.config.js";
import { ConfigModule } from "./config/config.module.js";
import { GoalModule } from "./goal/goal.module.js";
import { HealthModule } from "./health/health.module.js";
import { IntakeModule } from "./intake/intake.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { RoadmapModule } from "./roadmap/roadmap.module.js";
import { SubscriptionModule } from "./subscription/subscription.module.js";
import { SupabaseModule } from "./supabase/supabase.module.js";
import { TranscriptionModule } from "./transcription/transcription.module.js";
import { UsageModule } from "./usage/usage.module.js";
import { UserModule } from "./user/user.module.js";

@Module({
  imports: [
    CommonModule,
    ConfigModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: config.throttle.globalTtlMs,
        limit: config.throttle.globalLimit,
      },
    ]),
    SupabaseModule,
    UsageModule,
    SubscriptionModule,
    AiModule,
    GoalModule,
    HealthModule,
    IntakeModule,
    RoadmapModule,
    CoachModule,
    TranscriptionModule,
    ChatModule,
    NotificationsModule,
    AdminModule,
    UserModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
