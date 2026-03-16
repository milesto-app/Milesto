import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';

import { ChatHistoryService } from '../chat/chat-history.service.js';
import { ChatToolRegistryService } from '../chat/chat-tool-registry.service.js';
import { ElevenLabsToolAuthGuard } from './guards/elevenlabs-tool-auth.guard.js';
import type { VoiceSession } from './voice-chat-session.store.js';
import { VoiceChatSessionStore } from './voice-chat-session.store.js';
import { VoiceChatToolsController } from './voice-chat-tools.controller.js';

const MOCK_SESSION: VoiceSession = {
  id: 'session-001',
  userId: 'user-123',
  goalId: 'goal-456',
  conversationId: 'conv-789',
  elevenlabsConversationId: 'el-conv-100',
  status: 'active',
  transcriptStored: false,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
};

const mockExecutor = jest.fn();

let controller: VoiceChatToolsController;
let toolRegistryService: { getRegistry: jest.Mock };
let chatHistoryService: { storeMessage: jest.Mock };

function buildRequest(session: VoiceSession): Request {
  return { voiceSession: session } as unknown as Request;
}

beforeEach(async () => {
  mockExecutor.mockReset().mockResolvedValue({ result: 'ok' });

  toolRegistryService = {
    getRegistry: jest
      .fn()
      .mockReturnValue(new Map([['test_tool', { executor: mockExecutor }]])),
  };
  chatHistoryService = {
    storeMessage: jest.fn().mockResolvedValue({ id: 'msg-1' }),
  };

  const module: TestingModule = await Test.createTestingModule({
    controllers: [VoiceChatToolsController],
    providers: [
      { provide: ChatToolRegistryService, useValue: toolRegistryService },
      { provide: ChatHistoryService, useValue: chatHistoryService },
      { provide: VoiceChatSessionStore, useValue: {} },
    ],
  })
    .overrideGuard(ElevenLabsToolAuthGuard)
    .useValue({ canActivate: () => true })
    .compile();

  controller = module.get<VoiceChatToolsController>(VoiceChatToolsController);
});

describe('VoiceChatToolsController', () => {
  describe('executeTool', () => {
    it('should execute the tool and return its result', async () => {
      const result = await controller.executeTool(
        'test_tool',
        { arg: 'value' },
        buildRequest(MOCK_SESSION),
      );

      expect(result).toEqual({ result: 'ok' });
      expect(mockExecutor).toHaveBeenCalledWith(
        { arg: 'value' },
        { userId: 'user-123', goalId: 'goal-456' },
      );
    });

    it('should store the tool result as a message', async () => {
      await controller.executeTool('test_tool', {}, buildRequest(MOCK_SESSION));

      expect(chatHistoryService.storeMessage).toHaveBeenCalledWith(
        'conv-789',
        expect.objectContaining({
          role: 'tool',
          tool_name: 'test_tool',
        }),
      );
    });

    it('should throw ForbiddenException when session is not active', async () => {
      const endedSession = { ...MOCK_SESSION, status: 'ended' as const };

      await expect(
        controller.executeTool('test_tool', {}, buildRequest(endedSession)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when tool does not exist', async () => {
      await expect(
        controller.executeTool(
          'nonexistent_tool',
          {},
          buildRequest(MOCK_SESSION),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should still return the result when storing the message fails', async () => {
      chatHistoryService.storeMessage.mockRejectedValue(new Error('DB error'));

      const result = await controller.executeTool(
        'test_tool',
        {},
        buildRequest(MOCK_SESSION),
      );

      expect(result).toEqual({ result: 'ok' });
    });
  });
});
