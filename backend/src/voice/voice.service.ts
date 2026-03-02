import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service.js';
import { VoiceSttService } from './voice-stt.service.js';
import { VoiceTtsService } from './voice-tts.service.js';
import type { TranscriptionResult, SynthesisResult } from './voice.types.js';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly sttService: VoiceSttService,
    private readonly ttsService: VoiceTtsService,
  ) {}

  public async transcribe(audioBuffer: Buffer, mimetype: string): Promise<TranscriptionResult> {
    return this.sttService.transcribe(audioBuffer, mimetype);
  }

  public async synthesize(text: string, coachId: number): Promise<SynthesisResult> {
    const voiceId = await this.resolveVoiceId(coachId);
    this.logger.log(`Synthesizing for coach ${String(coachId)} with voice ${voiceId}`);
    return this.ttsService.synthesize(text, voiceId);
  }

  private async resolveVoiceId(coachId: number): Promise<string> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('coaches')
      .select('deepgram_voice_id')
      .eq('id', coachId)
      .eq('is_active', true)
      .single();

    if (error !== null) {
      throw new NotFoundException(`Coach with id ${String(coachId)} not found`);
    }

    return (data as { deepgram_voice_id: string }).deepgram_voice_id;
  }
}
