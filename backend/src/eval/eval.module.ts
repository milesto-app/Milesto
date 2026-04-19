import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { AiModule } from "../ai/ai.module.js";
import { ConfigModule } from "../config/config.module.js";
import { IntakeModule } from "../intake/intake.module.js";
import { SupabaseModule } from "../supabase/supabase.module.js";
import { EvalService } from "./eval.service.js";
import { EvalJudgeService } from "./eval-judge.service.js";
import { EvalReportService } from "./eval-report.service.js";
import { EvalScoringService } from "./eval-scoring.service.js";

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    SupabaseModule,
    AiModule,
    IntakeModule,
  ],
  providers: [
    EvalService,
    EvalJudgeService,
    EvalReportService,
    EvalScoringService,
  ],
})
export class EvalModule {}
