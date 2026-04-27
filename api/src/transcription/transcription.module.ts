import { Module } from "@nestjs/common";

import { TranscriptionController } from "./transcription.controller.js";
import { TranscriptionService } from "./transcription.service.js";
import { TranscriptionSttService } from "./transcription-stt.service.js";

@Module({
  controllers: [TranscriptionController],
  providers: [TranscriptionService, TranscriptionSttService],
  exports: [TranscriptionService],
})
export class TranscriptionModule {}
