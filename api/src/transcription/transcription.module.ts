import { Module } from "@nestjs/common";

import { UsageModule } from "../usage/usage.module.js";
import { TranscriptionController } from "./transcription.controller.js";
import { TranscriptionService } from "./transcription.service.js";
import { TranscriptionSttService } from "./transcription-stt.service.js";

@Module({
  imports: [UsageModule],
  controllers: [TranscriptionController],
  providers: [TranscriptionService, TranscriptionSttService],
  exports: [TranscriptionService],
})
export class TranscriptionModule {}
