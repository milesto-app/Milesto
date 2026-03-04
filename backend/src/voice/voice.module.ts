import { Module } from '@nestjs/common';

import { VoiceController } from './voice.controller.js';
import { VoiceService } from './voice.service.js';
import { VoiceSttService } from './voice-stt.service.js';
import { VoiceTtsService } from './voice-tts.service.js';

@Module({
  controllers: [VoiceController],
  providers: [VoiceService, VoiceSttService, VoiceTtsService],
  exports: [VoiceService],
})
export class VoiceModule {}
