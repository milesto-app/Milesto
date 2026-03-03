import { Test } from '@nestjs/testing';
import { VoiceChatGateway } from './voice-chat.gateway.js';
import { VoiceChatAuthService } from './voice-chat-auth.service.js';
import { VoiceChatSessionService } from './voice-chat-session.service.js';
import { ChatPromptService } from '../chat/chat-prompt.service.js';
import { CoachService } from '../coach/coach.service.js';
import type { ActiveSession } from './voice-chat-session.service.js';

const WS_CLOSE_POLICY = 1008;

interface MockClient {
  send: jest.Mock;
  close: jest.Mock;
  on: jest.Mock;
  readyState: number;
  OPEN: number;
}

function createMockClient(): MockClient {
  return { send: jest.fn(), close: jest.fn(), on: jest.fn(), readyState: 1, OPEN: 1 };
}

function getMessageHandler(client: MockClient): (raw: Buffer) => void {
  const onCall = client.on.mock.calls.find((c: [string, unknown]) => c[0] === 'message') as [
    string,
    (raw: Buffer) => void,
  ];
  return onCall[1];
}

describe('VoiceChatGateway', () => {
  let gateway: VoiceChatGateway;
  let authService: { authenticateToken: jest.Mock; extractTokenFromUrl: jest.Mock };
  let sessionService: {
    hasActiveSession: jest.Mock;
    createSession: jest.Mock;
    destroySession: jest.Mock;
    getSession: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      authenticateToken: jest.fn(),
      extractTokenFromUrl: jest.fn(),
    };
    sessionService = {
      hasActiveSession: jest.fn().mockReturnValue(false),
      createSession: jest.fn(),
      destroySession: jest.fn(),
      getSession: jest.fn(),
    };
    const promptService = {
      getUserProfile: jest.fn().mockResolvedValue({ coachId: 1, language: 'en' }),
      fetchGoalContext: jest
        .fn()
        .mockResolvedValue({ goal: null, milestone: null, weeklyPlan: null }),
      fetchMemory: jest.fn().mockResolvedValue(''),
      buildSystemPrompt: jest.fn().mockResolvedValue('System prompt'),
    };
    const coachService = {
      getCoach: jest.fn().mockResolvedValue({ google_voice_name: 'Puck' }),
    };

    const module = await Test.createTestingModule({
      providers: [
        VoiceChatGateway,
        { provide: VoiceChatAuthService, useValue: authService },
        { provide: VoiceChatSessionService, useValue: sessionService },
        { provide: ChatPromptService, useValue: promptService },
        { provide: CoachService, useValue: coachService },
      ],
    }).compile();

    gateway = module.get(VoiceChatGateway);
  });

  it('should reject connection when token is missing', async () => {
    authService.extractTokenFromUrl.mockReturnValue(null);
    const client = createMockClient();

    await gateway.handleConnection(client as never, { url: '/api/voice-chat' } as never);

    expect(client.close).toHaveBeenCalledWith(WS_CLOSE_POLICY, 'Missing token');
  });

  it('should reject connection when token is invalid', async () => {
    authService.extractTokenFromUrl.mockReturnValue('bad-token');
    authService.authenticateToken.mockResolvedValue(null);
    const client = createMockClient();

    await gateway.handleConnection(client as never, { url: '?token=bad' } as never);

    expect(client.close).toHaveBeenCalledWith(WS_CLOSE_POLICY, 'Invalid token');
  });

  it('should accept connection with valid token', async () => {
    authService.extractTokenFromUrl.mockReturnValue('good-token');
    authService.authenticateToken.mockResolvedValue({ id: 'user-1' });
    const client = createMockClient();

    await gateway.handleConnection(client as never, { url: '?token=good' } as never);

    expect(client.close).not.toHaveBeenCalled();
    expect(client.on).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('should destroy session on disconnect', async () => {
    authService.extractTokenFromUrl.mockReturnValue('token');
    authService.authenticateToken.mockResolvedValue({ id: 'user-1' });
    const client = createMockClient();

    await gateway.handleConnection(client as never, { url: '?token=t' } as never);
    gateway.handleDisconnect(client as never);

    expect(sessionService.destroySession).toHaveBeenCalledWith('user-1');
  });

  it('should reject start_session when session already active', async () => {
    authService.extractTokenFromUrl.mockReturnValue('token');
    authService.authenticateToken.mockResolvedValue({ id: 'user-1' });
    sessionService.hasActiveSession.mockReturnValue(true);
    const client = createMockClient();

    await gateway.handleConnection(client as never, { url: '?token=t' } as never);
    const handler = getMessageHandler(client);
    handler(Buffer.from(JSON.stringify({ type: 'start_session', goalId: 'g1' })));
    await new Promise(process.nextTick);

    expect(client.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'error', message: 'Session already active' }),
    );
  });

  it('should create session and send session_started', async () => {
    authService.extractTokenFromUrl.mockReturnValue('token');
    authService.authenticateToken.mockResolvedValue({ id: 'user-1' });
    sessionService.createSession.mockResolvedValue({
      conversationId: 'conv-1',
    } as ActiveSession);
    const client = createMockClient();

    await gateway.handleConnection(client as never, { url: '?token=t' } as never);
    const handler = getMessageHandler(client);
    handler(Buffer.from(JSON.stringify({ type: 'start_session', goalId: 'g1' })));
    await new Promise(process.nextTick);

    expect(sessionService.createSession).toHaveBeenCalled();
    expect(client.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'session_started', conversationId: 'conv-1' }),
    );
  });
});
