import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { UserLanguageService } from '../common/user-language.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { SynthesisResult, TranscriptionResult } from './voice.types.js';
import { VoiceSttService } from './voice-stt.service.js';
import { VoiceTtsService } from './voice-tts.service.js';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  // eslint-disable-next-line max-params
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly sttService: VoiceSttService,
    private readonly ttsService: VoiceTtsService,
    private readonly languageService: UserLanguageService,
  ) {}

  public async transcribe(
    audioBuffer: Buffer,
    mimetype: string,
    userId: string,
  ): Promise<TranscriptionResult> {
    const language = await this.languageService.getLanguage(userId);
    return this.sttService.transcribe(audioBuffer, mimetype, language);
  }

  public async synthesize(
    text: string,
    coachId: number,
  ): Promise<SynthesisResult> {
    const voiceId = await this.resolveVoiceId(coachId);
    this.logger.log(
      `Synthesizing for coach ${String(coachId)} with voice ${voiceId}`,
    );
    return this.ttsService.synthesize(text, voiceId);
  }

  private async resolveVoiceId(coachId: number): Promise<string> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('coaches')
      .select('google_voice_name')
      .eq('id', coachId)
      .eq('is_active', true)
      .single();

    if (error !== null) {
      throw new NotFoundException(`Coach with id ${String(coachId)} not found`);
    }

    return (data as { google_voice_name: string }).google_voice_name;
  }
}
