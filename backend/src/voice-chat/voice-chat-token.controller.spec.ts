import { ForbiddenException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { ChatHistoryService } from '../chat/chat-history.service.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import type { VoiceSession } from './voice-chat-session.store.js';
import { VoiceChatSessionStore } from './voice-chat-session.store.js';
import { VoiceChatTokenController } from './voice-chat-token.controller.js';
import { VoiceChatTokenService } from './voice-chat-token.service.js';

const MOCK_USER_ID = 'user-123';
const MOCK_SESSION_ID = 'session-001';
const MOCK_CONVERSATION_ID = 'conv-789';

const MOCK_SESSION: VoiceSession = {
  id: MOCK_SESSION_ID,
  userId: MOCK_USER_ID,
  goalId: 'goal-456',
  conversationId: MOCK_CONVERSATION_ID,
  elevenlabsConversationId: null,
  status: 'active',
  transcriptStored: false,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
};

let controller: VoiceChatTokenController;
let tokenService: { createSession: jest.Mock };
let sessionStore: {
  get: jest.Mock;
  setElevenLabsConversationId: jest.Mock;
  endSession: jest.Mock;
};
let chatHistoryService: { storeVoiceMessage: jest.Mock };

beforeEach(async () => {
  tokenService = {
    createSession: jest.fn(),
  };
  sessionStore = {
    get: jest.fn(),
    setElevenLabsConversationId: jest.fn(),
    endSession: jest.fn(),
  };
  chatHistoryService = {
    storeVoiceMessage: jest.fn().mockResolvedValue({ id: 'msg-1' }),
  };

  const module: TestingModule = await Test.createTestingModule({
    controllers: [VoiceChatTokenController],
    providers: [
      { provide: VoiceChatTokenService, useValue: tokenService },
      { provide: VoiceChatSessionStore, useValue: sessionStore },
      { provide: ChatHistoryService, useValue: chatHistoryService },
    ],
  })
    .overrideGuard(AuthGuard)
    .useValue({ canActivate: () => true })
    .compile();

  controller = module.get<VoiceChatTokenController>(VoiceChatTokenController);
});

describe('VoiceChatTokenController', () => {
  describe('submitClientTranscript', () => {
    it('should store transcript turns when session is valid', async () => {
      sessionStore.get.mockResolvedValue(MOCK_SESSION);

      const result = await controller.submitClientTranscript(
        MOCK_SESSION_ID,
        {
          turns: [
            {
              role: 'user',
              content: 'Hello',
              timestamp: '2026-03-15T10:00:00Z',
              turnIndex: 0,
            },
            {
              role: 'agent',
              content: 'Hi there!',
              timestamp: '2026-03-15T10:00:01Z',
              turnIndex: 1,
            },
          ],
        },
        MOCK_USER_ID,
      );

      expect(result.stored).toBe(2);
      expect(chatHistoryService.storeVoiceMessage).toHaveBeenCalledTimes(2);
    });

    it('should throw ForbiddenException when session is not found', async () => {
      sessionStore.get.mockResolvedValue(null);

      await expect(
        controller.submitClientTranscript(
          MOCK_SESSION_ID,
          { turns: [{ role: 'user', content: 'Hi', timestamp: '2026-03-15T10:00:00Z', turnIndex: 0 }] },
          MOCK_USER_ID,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user is not session owner', async () => {
      sessionStore.get.mockResolvedValue(MOCK_SESSION);

      await expect(
        controller.submitClientTranscript(
          MOCK_SESSION_ID,
          { turns: [{ role: 'user', content: 'Hi', timestamp: '2026-03-15T10:00:00Z', turnIndex: 0 }] },
          'different-user',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should map agent role to assistant when storing', async () => {
      sessionStore.get.mockResolvedValue(MOCK_SESSION);

      await controller.submitClientTranscript(
        MOCK_SESSION_ID,
        {
          turns: [
            {
              role: 'agent',
              content: 'Response',
              timestamp: '2026-03-15T10:00:00Z',
              turnIndex: 0,
            },
          ],
        },
        MOCK_USER_ID,
      );

      expect(chatHistoryService.storeVoiceMessage).toHaveBeenCalledWith(
        MOCK_CONVERSATION_ID,
        expect.objectContaining({ role: 'assistant' }),
      );
    });

    it('should set source_type to voice for all turns', async () => {
      sessionStore.get.mockResolvedValue(MOCK_SESSION);

      await controller.submitClientTranscript(
        MOCK_SESSION_ID,
        {
          turns: [
            {
              role: 'user',
              content: 'Test',
              timestamp: '2026-03-15T10:00:00Z',
              turnIndex: 0,
            },
          ],
        },
        MOCK_USER_ID,
      );

      expect(chatHistoryService.storeVoiceMessage).toHaveBeenCalledWith(
        MOCK_CONVERSATION_ID,
        expect.objectContaining({
          source_type: 'voice',
          voice_session_id: MOCK_SESSION_ID,
        }),
      );
    });
  });
});
