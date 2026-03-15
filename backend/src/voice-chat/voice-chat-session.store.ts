import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';

import { config } from '../config/app.config.js';
import { SupabaseService } from '../supabase/supabase.service.js';

export interface VoiceSession {
  id: string;
  userId: string;
  goalId: string;
  conversationId: string;
  elevenlabsConversationId: string | null;
  status: 'active' | 'ended';
  transcriptStored: boolean;
  createdAt: string;
  expiresAt: string;
}

interface VoiceSessionRow {
  id: string;
  user_id: string;
  goal_id: string;
  conversation_id: string;
  elevenlabs_conversation_id: string | null;
  status: 'active' | 'ended';
  transcript_stored: boolean;
  created_at: string;
  expires_at: string;
}

const STALE_RETENTION_MS = 3_600_000;

@Injectable()
export class VoiceChatSessionStore {
  private readonly logger = new Logger(VoiceChatSessionStore.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async create(
    userId: string,
    goalId: string,
    conversationId: string,
    sessionSecret: string,
  ): Promise<string> {
    const supabase = this.supabaseService.getAdminClient();
    const id = randomUUID();
    const expiresAt = new Date(
      Date.now() + config.voice.sessionDurationMs,
    ).toISOString();

    const { error } = await supabase.from('voice_sessions').insert({
      id,
      user_id: userId,
      goal_id: goalId,
      conversation_id: conversationId,
      session_secret_hash: this.hashSecret(sessionSecret),
      status: 'active',
      expires_at: expiresAt,
    });

    if (error) {
      this.logger.error(
        `Failed to create voice session: ${error.message}`,
        error.message,
      );
      throw new Error(error.message);
    }

    return id;
  }

  async get(sessionId: string): Promise<VoiceSession | null> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('voice_sessions')
      .select('*')
      .eq('id', sessionId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRow(data as unknown as VoiceSessionRow);
  }

  async validateSecret(
    sessionId: string,
    secret: string,
  ): Promise<VoiceSession | null> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('voice_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('session_secret_hash', this.hashSecret(secret))
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRow(data as unknown as VoiceSessionRow);
  }

  async setElevenLabsConversationId(
    sessionId: string,
    elevenlabsConversationId: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    const { error } = await supabase
      .from('voice_sessions')
      .update({ elevenlabs_conversation_id: elevenlabsConversationId })
      .eq('id', sessionId);

    if (error) {
      this.logger.error(
        `Failed to set ElevenLabs conversation ID: ${error.message}`,
        error.message,
      );
    }
  }

  async endSession(sessionId: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    const { error } = await supabase
      .from('voice_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      this.logger.error(
        `Failed to end voice session: ${error.message}`,
        error.message,
      );
    }
  }

  async findByElevenLabsConversationId(
    elevenlabsConversationId: string,
  ): Promise<VoiceSession | null> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('voice_sessions')
      .select('*')
      .eq('elevenlabs_conversation_id', elevenlabsConversationId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRow(data as unknown as VoiceSessionRow);
  }

  async markTranscriptStored(sessionId: string): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('voice_sessions')
      .update({ transcript_stored: true })
      .eq('id', sessionId)
      .eq('transcript_stored', false)
      .select('id');

    if (error) {
      this.logger.error(
        `Failed to mark transcript stored: ${error.message}`,
        error.message,
      );
      return false;
    }

    return data.length > 0;
  }

  async purgeStale(): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const cutoff = new Date(Date.now() - STALE_RETENTION_MS).toISOString();

    const { error } = await supabase
      .from('voice_sessions')
      .delete()
      .eq('status', 'ended')
      .lt('ended_at', cutoff);

    if (error) {
      this.logger.warn(`Failed to purge stale sessions: ${error.message}`);
    }
  }

  private hashSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  private mapRow(row: VoiceSessionRow): VoiceSession {
    return {
      id: row.id,
      userId: row.user_id,
      goalId: row.goal_id,
      conversationId: row.conversation_id,
      elevenlabsConversationId: row.elevenlabs_conversation_id,
      status: row.status,
      transcriptStored: row.transcript_stored,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }
}
