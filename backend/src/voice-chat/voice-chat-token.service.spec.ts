import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { ChatHistoryService } from '../chat/chat-history.service.js';
import { ChatPromptService } from '../chat/chat-prompt.service.js';
import { CoachService } from '../coach/coach.service.js';
import { UsageService } from '../usage/usage.service.js';
import { VoiceChatSessionStore } from './voice-chat-session.store.js';
import { VoiceChatTokenService } from './voice-chat-token.service.js';

const MOCK_USER_ID = 'user-123';
const MOCK_GOAL_ID = 'goal-456';
const MOCK_CONVERSATION_ID = 'conv-789';
const MOCK_SESSION_ID = 'session-001';
const MOCK_SIGNED_URL = 'wss://elevenlabs.io/signed';

let service: VoiceChatTokenService;
let chatHistoryService: {
  getConversation: jest.Mock;
  createConversation: jest.Mock;
};
let chatPromptService: {
  getUserProfile: jest.Mock;
  fetchGoalContext: jest.Mock;
  fetchMemory: jest.Mock;
  buildSystemPrompt: jest.Mock;
};
let coachService: { getCoach: jest.Mock };
let sessionStore: { create: jest.Mock; purgeStale: jest.Mock };
let configService: { getOrThrow: jest.Mock };

beforeEach(async () => {
  chatHistoryService = {
    getConversation: jest.fn(),
    createConversation: jest.fn(),
  };
  chatPromptService = {
    getUserProfile: jest.fn().mockResolvedValue({
      coachId: 1,
      language: 'en',
    }),
    fetchGoalContext: jest.fn().mockResolvedValue({}),
    fetchMemory: jest.fn().mockResolvedValue(''),
    buildSystemPrompt: jest.fn().mockReturnValue('base prompt'),
  };
  coachService = {
    getCoach: jest.fn().mockReturnValue({
      elevenlabsVoiceId: 'voice-123',
    }),
  };
  sessionStore = {
    create: jest.fn().mockResolvedValue(MOCK_SESSION_ID),
    purgeStale: jest.fn().mockResolvedValue(undefined),
  };
  configService = {
    getOrThrow: jest.fn().mockReturnValue('test-key'),
  };

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => Promise.resolve({ signed_url: MOCK_SIGNED_URL }),
  });

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      VoiceChatTokenService,
      { provide: ChatHistoryService, useValue: chatHistoryService },
      { provide: ChatPromptService, useValue: chatPromptService },
      { provide: CoachService, useValue: coachService },
      { provide: VoiceChatSessionStore, useValue: sessionStore },
      { provide: ConfigService, useValue: configService },
      {
        provide: UsageService,
        useValue: {
          reserveGeneration: jest.fn().mockResolvedValue({
            granted: true,
            used: 1,
            limit: 20,
            is_pro: false,
          }),
        },
      },
    ],
  }).compile();

  service = module.get<VoiceChatTokenService>(VoiceChatTokenService);
});

describe('VoiceChatTokenService', () => {
  describe('createSession', () => {
    it('should create a new conversation when conversationId is not provided', async () => {
      chatHistoryService.createConversation.mockResolvedValue({
        id: MOCK_CONVERSATION_ID,
      });

      const result = await service.createSession(MOCK_USER_ID, MOCK_GOAL_ID);

      expect(chatHistoryService.createConversation).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_GOAL_ID,
      );
      expect(result.conversationId).toBe(MOCK_CONVERSATION_ID);
    });

    it('should reuse existing conversation when conversationId is provided', async () => {
      chatHistoryService.getConversation.mockResolvedValue({
        id: MOCK_CONVERSATION_ID,
        goal_id: MOCK_GOAL_ID,
      });

      const result = await service.createSession(
        MOCK_USER_ID,
        MOCK_GOAL_ID,
        MOCK_CONVERSATION_ID,
      );

      expect(chatHistoryService.getConversation).toHaveBeenCalledWith(
        MOCK_CONVERSATION_ID,
        MOCK_USER_ID,
      );
      expect(result.conversationId).toBe(MOCK_CONVERSATION_ID);
    });

    it('should throw BadRequestException when conversation goal does not match', async () => {
      chatHistoryService.getConversation.mockResolvedValue({
        id: MOCK_CONVERSATION_ID,
        goal_id: 'different-goal',
      });

      await expect(
        service.createSession(MOCK_USER_ID, MOCK_GOAL_ID, MOCK_CONVERSATION_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return a signed URL from ElevenLabs', async () => {
      chatHistoryService.createConversation.mockResolvedValue({
        id: MOCK_CONVERSATION_ID,
      });

      const result = await service.createSession(MOCK_USER_ID, MOCK_GOAL_ID);

      expect(result.signedUrl).toBe(MOCK_SIGNED_URL);
    });

    it('should wrap the system prompt for voice mode', async () => {
      chatHistoryService.createConversation.mockResolvedValue({
        id: MOCK_CONVERSATION_ID,
      });

      const result = await service.createSession(MOCK_USER_ID, MOCK_GOAL_ID);

      expect(result.overrides.prompt).toContain('<voice_mode>');
    });

    it('should throw BadRequestException when ElevenLabs returns an error', async () => {
      chatHistoryService.createConversation.mockResolvedValue({
        id: MOCK_CONVERSATION_ID,
      });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => Promise.resolve('Internal Server Error'),
      });

      await expect(
        service.createSession(MOCK_USER_ID, MOCK_GOAL_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
