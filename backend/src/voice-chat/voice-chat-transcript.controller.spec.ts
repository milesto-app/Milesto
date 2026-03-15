import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { ChatHistoryService } from '../chat/chat-history.service.js';
import { ElevenLabsWebhookAuthGuard } from './guards/elevenlabs-webhook-auth.guard.js';
import type { VoiceSession } from './voice-chat-session.store.js';
import { VoiceChatSessionStore } from './voice-chat-session.store.js';
import { VoiceChatTranscriptController } from './voice-chat-transcript.controller.js';

const MOCK_SESSION: VoiceSession = {
  id: 'session-001',
  userId: 'user-123',
  goalId: 'goal-456',
  conversationId: 'conv-789',
  elevenlabsConversationId: 'el-conv-100',
  status: 'ended',
  transcriptStored: false,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
};

let controller: VoiceChatTranscriptController;
let sessionStore: {
  findByElevenLabsConversationId: jest.Mock;
  markTranscriptStored: jest.Mock;
};
let chatHistoryService: { storeVoiceMessage: jest.Mock };

beforeEach(async () => {
  sessionStore = {
    findByElevenLabsConversationId: jest.fn(),
    markTranscriptStored: jest.fn().mockResolvedValue(true),
  };
  chatHistoryService = {
    storeVoiceMessage: jest.fn().mockResolvedValue({ id: 'msg-1' }),
  };

  const module: TestingModule = await Test.createTestingModule({
    controllers: [VoiceChatTranscriptController],
    providers: [
      { provide: VoiceChatSessionStore, useValue: sessionStore },
      { provide: ChatHistoryService, useValue: chatHistoryService },
    ],
  })
    .overrideGuard(ElevenLabsWebhookAuthGuard)
    .useValue({ canActivate: () => true })
    .compile();

  controller = module.get<VoiceChatTranscriptController>(
    VoiceChatTranscriptController,
  );
});

describe('VoiceChatTranscriptController', () => {
  describe('receiveTranscript', () => {
    it('should return ok when no session is found', async () => {
      sessionStore.findByElevenLabsConversationId.mockResolvedValue(null);

      const result = await controller.receiveTranscript({
        conversation_id: 'unknown',
        transcript: [],
      });

      expect(result).toEqual({ status: 'ok' });
      expect(chatHistoryService.storeVoiceMessage).not.toHaveBeenCalled();
    });

    it('should upsert each turn with voice metadata', async () => {
      sessionStore.findByElevenLabsConversationId.mockResolvedValue(
        MOCK_SESSION,
      );

      await controller.receiveTranscript({
        conversation_id: 'el-conv-100',
        transcript: [
          { role: 'user', message: 'Hello' },
          { role: 'agent', message: 'Hi there!' },
        ],
      });

      expect(chatHistoryService.storeVoiceMessage).toHaveBeenCalledTimes(2);
      expect(chatHistoryService.storeVoiceMessage).toHaveBeenCalledWith(
        'conv-789',
        expect.objectContaining({
          role: 'user',
          content: 'Hello',
          source_type: 'voice',
          voice_session_id: 'session-001',
          turn_index: 0,
        }),
      );
      expect(chatHistoryService.storeVoiceMessage).toHaveBeenCalledWith(
        'conv-789',
        expect.objectContaining({
          role: 'assistant',
          content: 'Hi there!',
          turn_index: 1,
        }),
      );
    });

    it('should mark transcript as stored after processing', async () => {
      sessionStore.findByElevenLabsConversationId.mockResolvedValue(
        MOCK_SESSION,
      );

      await controller.receiveTranscript({
        conversation_id: 'el-conv-100',
        transcript: [{ role: 'user', message: 'Test' }],
      });

      expect(sessionStore.markTranscriptStored).toHaveBeenCalledWith(
        'session-001',
      );
    });

    it('should continue processing when a single turn fails', async () => {
      sessionStore.findByElevenLabsConversationId.mockResolvedValue(
        MOCK_SESSION,
      );
      chatHistoryService.storeVoiceMessage
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ id: 'msg-2' });

      const result = await controller.receiveTranscript({
        conversation_id: 'el-conv-100',
        transcript: [
          { role: 'user', message: 'First' },
          { role: 'agent', message: 'Second' },
        ],
      });

      expect(result).toEqual({ status: 'ok' });
      expect(chatHistoryService.storeVoiceMessage).toHaveBeenCalledTimes(2);
    });
  });
});
