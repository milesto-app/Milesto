import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { GeminiLiveService } from './gemini-live.service.js';
import type { GeminiSessionCallbacks } from './types/voice-chat.types.js';

const mockSession = {
  sendRealtimeInput: jest.fn(),
  sendToolResponse: jest.fn(),
  close: jest.fn(),
};

interface MockCallbacks {
  onmessage: (msg: unknown) => void;
  onerror: (e: unknown) => void;
  onclose: () => void;
}

let capturedCallbacks: MockCallbacks;

jest.mock('@google/genai', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors SDK export
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    live: {
      connect: jest
        .fn()
        .mockImplementation(async (opts: { callbacks: MockCallbacks }) => {
          capturedCallbacks = opts.callbacks;
          return Promise.resolve(mockSession);
        }),
    },
  })),
  // eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors SDK export
  Modality: { AUDIO: 'AUDIO' },
  // eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors SDK export
  Session: class {},
}));

const BASE_OPTIONS = {
  systemInstruction: 'Test',
  voiceName: 'Puck',
  tools: [],
};

describe('GeminiLiveService', () => {
  let service: GeminiLiveService;
  let mockCallbacks: GeminiSessionCallbacks;

  beforeEach(async () => {
    mockCallbacks = {
      onAudioData: jest.fn(),
      onToolCall: jest.fn(),
      onInterrupted: jest.fn(),
      onTurnComplete: jest.fn(),
      onError: jest.fn(),
      onClose: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        GeminiLiveService,
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('test-api-key') },
        },
      ],
    }).compile();

    service = module.get(GeminiLiveService);
    jest.clearAllMocks();
  });

  it('should create a session and return a wrapper', async () => {
    const session = await service.createSession({
      ...BASE_OPTIONS,
      callbacks: mockCallbacks,
    });

    expect(session.sendAudio).toBeDefined();
    expect(session.sendToolResponse).toBeDefined();
    expect(session.close).toBeDefined();
  });

  it('should forward audio data via sendAudio', async () => {
    const session = await service.createSession({
      ...BASE_OPTIONS,
      callbacks: mockCallbacks,
    });

    session.sendAudio('base64data');
    expect(mockSession.sendRealtimeInput).toHaveBeenCalledWith({
      audio: { data: 'base64data', mimeType: 'audio/pcm;rate=16000' },
    });
  });

  it('should route audio content to onAudioData callback', async () => {
    await service.createSession({ ...BASE_OPTIONS, callbacks: mockCallbacks });

    capturedCallbacks.onmessage({
      serverContent: {
        modelTurn: { parts: [{ inlineData: { data: 'audio-chunk' } }] },
      },
    });

    expect(mockCallbacks.onAudioData).toHaveBeenCalledWith('audio-chunk');
  });

  it('should route tool calls to onToolCall callback', async () => {
    await service.createSession({ ...BASE_OPTIONS, callbacks: mockCallbacks });

    capturedCallbacks.onmessage({
      toolCall: {
        functionCalls: [{ id: '1', name: 'getDailyObjectives', args: {} }],
      },
    });

    expect(mockCallbacks.onToolCall).toHaveBeenCalledWith([
      { id: '1', name: 'getDailyObjectives', args: {} },
    ]);
  });

  it('should call onInterrupted when interrupted', async () => {
    await service.createSession({ ...BASE_OPTIONS, callbacks: mockCallbacks });

    capturedCallbacks.onmessage({ serverContent: { interrupted: true } });
    expect(mockCallbacks.onInterrupted).toHaveBeenCalled();
  });

  it('should call onTurnComplete when turn completes', async () => {
    await service.createSession({ ...BASE_OPTIONS, callbacks: mockCallbacks });

    capturedCallbacks.onmessage({ serverContent: { turnComplete: true } });
    expect(mockCallbacks.onTurnComplete).toHaveBeenCalled();
  });

  it('should call onError on error event', async () => {
    await service.createSession({ ...BASE_OPTIONS, callbacks: mockCallbacks });

    capturedCallbacks.onerror(new Error('Connection lost'));
    expect(mockCallbacks.onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should call onClose on close event', async () => {
    await service.createSession({ ...BASE_OPTIONS, callbacks: mockCallbacks });

    capturedCallbacks.onclose();
    expect(mockCallbacks.onClose).toHaveBeenCalled();
  });
});
