import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { SupabaseService } from '../supabase/supabase.service.js';
import { VoiceChatSessionStore } from './voice-chat-session.store.js';

const MOCK_ROW = {
  id: 'session-001',
  user_id: 'user-123',
  goal_id: 'goal-456',
  conversation_id: 'conv-789',
  elevenlabs_conversation_id: null,
  status: 'active',
  transcript_stored: false,
  created_at: '2026-03-15T10:00:00Z',
  expires_at: '2026-03-15T11:00:00Z',
};

let store: VoiceChatSessionStore;
let mockFrom: jest.Mock;
let mockChain: Record<string, jest.Mock>;

function buildChain(overrides: Partial<typeof mockChain> = {}) {
  const chain: Record<string, jest.Mock> = {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: MOCK_ROW, error: null }),
    ...overrides,
  };
  return chain;
}

beforeEach(async () => {
  mockChain = buildChain();
  mockFrom = jest.fn().mockReturnValue(mockChain);

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      VoiceChatSessionStore,
      {
        provide: SupabaseService,
        useValue: {
          getAdminClient: () => ({ from: mockFrom }),
        },
      },
    ],
  }).compile();

  store = module.get<VoiceChatSessionStore>(VoiceChatSessionStore);
});

describe('VoiceChatSessionStore', () => {
  describe('create', () => {
    it('should insert a voice session and return its id', async () => {
      mockChain.insert = jest.fn().mockResolvedValue({ error: null });

      const id = await store.create('user-123', 'goal-456', 'conv-789', 'secret');

      expect(mockFrom).toHaveBeenCalledWith('voice_sessions');
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should throw when insert fails', async () => {
      mockChain.insert = jest
        .fn()
        .mockResolvedValue({ error: { message: 'insert failed' } });

      await expect(
        store.create('user-123', 'goal-456', 'conv-789', 'secret'),
      ).rejects.toThrow('insert failed');
    });
  });

  describe('get', () => {
    it('should return a mapped session when found', async () => {
      const session = await store.get('session-001');

      expect(session).not.toBeNull();
      expect(session!.id).toBe('session-001');
      expect(session!.userId).toBe('user-123');
    });

    it('should return null when session is not found', async () => {
      mockChain.single = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'not found' } });

      const session = await store.get('nonexistent');

      expect(session).toBeNull();
    });
  });

  describe('validateSecret', () => {
    it('should return a session when secret matches', async () => {
      const session = await store.validateSecret('session-001', 'secret');

      expect(session).not.toBeNull();
      expect(mockChain.eq).toHaveBeenCalledWith(
        'session_secret_hash',
        expect.any(String),
      );
    });

    it('should return null when secret does not match', async () => {
      mockChain.single = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'not found' } });

      const session = await store.validateSecret('session-001', 'wrong');

      expect(session).toBeNull();
    });
  });

  describe('endSession', () => {
    it('should update session status to ended', async () => {
      mockChain.eq = jest.fn().mockResolvedValue({ error: null });

      await store.endSession('session-001');

      expect(mockFrom).toHaveBeenCalledWith('voice_sessions');
      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ended' }),
      );
    });
  });

  describe('markTranscriptStored', () => {
    it('should return true when transcript was not already stored', async () => {
      mockChain.select = jest
        .fn()
        .mockResolvedValue({ data: [{ id: 'session-001' }], error: null });

      const result = await store.markTranscriptStored('session-001');

      expect(result).toBe(true);
    });

    it('should return false when transcript was already stored', async () => {
      mockChain.select = jest
        .fn()
        .mockResolvedValue({ data: [], error: null });

      const result = await store.markTranscriptStored('session-001');

      expect(result).toBe(false);
    });
  });

  describe('findByElevenLabsConversationId', () => {
    it('should return a session when found by ElevenLabs conversation id', async () => {
      const session = await store.findByElevenLabsConversationId('el-conv-100');

      expect(session).not.toBeNull();
      expect(mockChain.eq).toHaveBeenCalledWith(
        'elevenlabs_conversation_id',
        'el-conv-100',
      );
    });

    it('should return null when no session matches', async () => {
      mockChain.single = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'not found' } });

      const session = await store.findByElevenLabsConversationId('unknown');

      expect(session).toBeNull();
    });
  });
});
